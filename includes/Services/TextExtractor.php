<?php
namespace TextToSpeechPlayer\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Text Extractor & Content Sanitizer for Speech Synthesis.
 */
class TextExtractor {

	/**
	 * Extract clean, speakable text from HTML content and options.
	 *
	 * @param string   $content Raw HTML post content.
	 * @param array    $options Extraction and filtering options.
	 * @param \WP_Post $post    Optional post object for title/excerpt.
	 * @return string Clean speakable plain text.
	 */
	public function extract( $content, $options = array(), $post = null ) {
		$result = $this->extract_with_offsets( $content, $options, $post );
		return $result['text'];
	}

	/**
	 * Extract speakable text along with exact content body start/end character offsets.
	 *
	 * @param string   $content Raw HTML post content.
	 * @param array    $options Extraction and filtering options.
	 * @param \WP_Post $post    Optional post object for title/excerpt.
	 * @return array Array with keys: text, body_start, body_end, body_length, intro, outro, pre_text, body_text, outro_text.
	 */
	public function extract_with_offsets( $content, $options = array(), $post = null ) {
		if ( empty( $content ) && empty( $post ) ) {
			return array(
				'text'        => '',
				'body_start'  => 0,
				'body_end'    => 0,
				'body_length' => 0,
				'intro'       => '',
				'outro'       => '',
				'pre_text'    => '',
				'body_text'   => '',
				'outro_text'  => '',
			);
		}

		$cleaned = (string) $content;

		// 1. Build exclude tags list
		$default_exclude = array( 'script', 'style', 'pre', 'code', 'iframe', 'audio', 'video', 'noscript', 'nav', 'footer' );
		if ( ! empty( $options['exclude_tags'] ) ) {
			$custom_tags = is_array( $options['exclude_tags'] )
				? $options['exclude_tags']
				: explode( '|', str_replace( array( ',', ' ' ), '|', $options['exclude_tags'] ) );
			$exclude_tags = array_unique( array_merge( $default_exclude, array_map( 'sanitize_key', $custom_tags ) ) );
		} else {
			$exclude_tags = $default_exclude;
		}

		$tags_pattern = implode( '|', array_filter( $exclude_tags ) );
		if ( ! empty( $tags_pattern ) ) {
			$cleaned = preg_replace( '@<(' . $tags_pattern . ')[^>]*?>.*?</\\1>@si', ' ', $cleaned );
		}

		// 2. Strip elements matching exclude CSS classes/selectors if DOMDocument available
		if ( ! empty( $options['exclude_css_selectors'] ) && class_exists( '\DOMDocument' ) && function_exists( 'mb_convert_encoding' ) ) {
			$cleaned = $this->strip_by_css_selectors( $cleaned, $options['exclude_css_selectors'] );
		}

		// 3. Strip shortcodes (registered and unparsed bracket shortcodes)
		$cleaned = strip_shortcodes( $cleaned );
		$cleaned = preg_replace( '/\[\/?[\w\-:]+(?:\s+[^\]]*)?\]/', ' ', $cleaned );

		// Ensure block endings have whitespace before tags are stripped
		$cleaned = preg_replace( '/<\/(p|blockquote|li|h[1-6]|div|tr)>/i', ' </$1> ', $cleaned );

		// 4. Strip all remaining HTML tags
		$cleaned = wp_strip_all_tags( $cleaned, true );

		// 5. Exclude specific words or phrases
		if ( ! empty( $options['exclude_texts'] ) ) {
			$phrases = is_array( $options['exclude_texts'] )
				? $options['exclude_texts']
				: explode( '|', str_replace( "\n", '|', (string) $options['exclude_texts'] ) );

			foreach ( $phrases as $phrase ) {
				$phrase = trim( $phrase );
				if ( '' !== $phrase ) {
					$cleaned = str_ireplace( $phrase, ' ', $cleaned );
				}
			}
		}

		// 6. Strip raw URLs (http/https/ftp) to prevent awkward spelling out in audio
		$cleaned = preg_replace( '#\bhttps?://[^\s<>"\'\)]+#i', ' ', $cleaned );

		// 7. Normalise whitespace
		$cleaned = trim( preg_replace( '/\s+/', ' ', $cleaned ) );

		// 8. Assemble audio parts (Intro, Title, Excerpt, Body, Outro)
		$pre_parts  = array();
		$intro_text = '';

		// Intro text
		if ( ! empty( $options['text_before_content'] ) ) {
			$intro = trim( $options['text_before_content'] );
			if ( '' !== $intro ) {
				$intro_text  = rtrim( $intro, '.' ) . '.';
				$pre_parts[] = $intro_text;
			}
		}

		// Post title
		if ( ! empty( $options['include_post_title'] ) && $post && ! empty( $post->post_title ) ) {
			$pre_parts[] = rtrim( trim( wp_strip_all_tags( $post->post_title ) ), '.' ) . '.';
		}

		// Post excerpt
		if ( ! empty( $options['include_post_excerpt'] ) && $post && ! empty( $post->post_excerpt ) ) {
			$pre_parts[] = rtrim( trim( wp_strip_all_tags( $post->post_excerpt ) ), '.' ) . '.';
		}

		$pre_text = ! empty( $pre_parts ) ? trim( implode( ' ', $pre_parts ) ) : '';

		// Main content body
		$body_text = $cleaned;

		// Outro text
		$post_parts = array();
		$outro_text = '';
		if ( ! empty( $options['text_after_content'] ) ) {
			$outro = trim( $options['text_after_content'] );
			if ( '' !== $outro ) {
				$outro_text   = rtrim( $outro, '.' ) . '.';
				$post_parts[] = $outro_text;
			}
		}
		$post_text = ! empty( $post_parts ) ? trim( implode( ' ', $post_parts ) ) : '';

		$all_parts = array();
		if ( '' !== $pre_text ) {
			$all_parts[] = $pre_text;
		}
		if ( '' !== $body_text ) {
			$all_parts[] = $body_text;
		}
		if ( '' !== $post_text ) {
			$all_parts[] = $post_text;
		}

		$final_text = trim( implode( ' ', $all_parts ) );

		// Calculate precise character offsets
		$body_start = ( '' !== $pre_text ) ? mb_strlen( $pre_text . ' ' ) : 0;
		$body_len   = mb_strlen( $body_text );
		$body_end   = $body_start + $body_len;

		/**
		 * Filter the final extracted speakable text.
		 *
		 * @param string   $final_text Extracted plain text.
		 * @param string   $content    Raw content.
		 * @param array    $options    Options.
		 * @param \WP_Post $post       Post object.
		 */
		$filtered_text = apply_filters( 'tts_player_extracted_text', $final_text, $content, $options, $post );

		return array(
			'text'        => $filtered_text,
			'body_start'  => $body_start,
			'body_end'    => $body_end,
			'body_length' => $body_len,
			'intro'       => $intro_text,
			'outro'       => $outro_text,
			'pre_text'    => $pre_text,
			'body_text'   => $body_text,
			'outro_text'  => $post_text,
		);
	}

	/**
	 * Strip elements matching CSS class or id selectors via DOMDocument.
	 *
	 * @param string $html
	 * @param string $selectors Comma or space separated selectors (.class, #id).
	 * @return string
	 */
	protected function strip_by_css_selectors( $html, $selectors ) {
		if ( empty( $html ) || empty( $selectors ) ) {
			return $html;
		}

		$parts = array_filter( array_map( 'trim', preg_split( '/[,|]/', $selectors ) ) );
		if ( empty( $parts ) ) {
			return $html;
		}

		$dom = new \DOMDocument();
		libxml_use_internal_errors( true );
		$wrapped = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' . $html . '</body></html>';
		$dom->loadHTML( mb_convert_encoding( $wrapped, 'HTML-ENTITIES', 'UTF-8' ) );
		libxml_clear_errors();

		$xpath = new \DOMXPath( $dom );
		foreach ( $parts as $sel ) {
			$sel = trim( $sel );
			if ( strpos( $sel, '.' ) === 0 ) {
				$class = sanitize_html_class( substr( $sel, 1 ) );
				$nodes = $xpath->query( "//*[contains(concat(' ', normalize-space(@class), ' '), ' {$class} ')]" );
				if ( $nodes ) {
					foreach ( iterator_to_array( $nodes ) as $node ) {
						$node->parentNode->removeChild( $node );
					}
				}
			} elseif ( strpos( $sel, '#' ) === 0 ) {
				$id    = sanitize_html_class( substr( $sel, 1 ) );
				$nodes = $xpath->query( "//*[@id='{$id}']" );
				if ( $nodes ) {
					foreach ( iterator_to_array( $nodes ) as $node ) {
						$node->parentNode->removeChild( $node );
					}
				}
			}
		}

		$body = $dom->getElementsByTagName( 'body' )->item( 0 );
		if ( ! $body ) {
			return $html;
		}

		$output = '';
		foreach ( $body->childNodes as $child ) {
			$output .= $dom->saveHTML( $child );
		}

		return $output ?: $html;
	}
}
