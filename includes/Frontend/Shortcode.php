<?php
namespace TextToSpeechPlayer\Frontend;

defined( 'ABSPATH' ) || exit;

/**
 * Enhanced Shortcode Handler for [tts_player], [atlasvoice], and [text-to-audio].
 */
class Shortcode {

	/**
	 * Player frontend service.
	 *
	 * @var Player
	 */
	protected $player;

	/**
	 * Constructor.
	 *
	 * @param Player $player
	 */
	public function __construct( Player $player ) {
		$this->player = $player;

		add_shortcode( 'tts_player', array( $this, 'render_shortcode' ) );
	}

	/**
	 * Render shortcode markup with full attribute and enclosed content support.
	 *
	 * @param array|string $atts Shortcode attributes.
	 * @param string|null  $content Enclosed content.
	 * @return string HTML player markup.
	 */
	public function render_shortcode( $atts, $content = null ) {
		$atts = shortcode_atts(
			array(
				'id'           => 0,
				'text'         => '',
				'text_to_read' => '',
				'voice'        => '',
				'rate'         => '',
				'listen_text'  => '',
				'pause_text'   => '',
				'resume_text'  => '',
				'replay_text'  => '',
				'theme'        => '',
				'accent'       => '',
				'radius'       => '',
				'size'         => '',
				'audio_url'       => '',
				'custom_mp3'      => '',
				'class'           => '',
				'position'        => '',
				'sticky'          => '',
				'sticky_position' => '',
				'offset_x'        => '',
				'offset_y'        => '',
				'show_listen_time'=> '',
				'download'        => '',
			),
			$atts,
			'tts_player'
		);

		global $post;
		$target_post = null;

		if ( ! empty( $atts['id'] ) ) {
			$candidate = get_post( absint( $atts['id'] ) );
			if ( $candidate && ( ( 'publish' === get_post_status( $candidate ) && ! post_password_required( $candidate ) ) || current_user_can( 'read_post', $candidate->ID ) ) ) {
				$target_post = $candidate;
			}
		}
		if ( ! $target_post && $post ) {
			$target_post = $post;
		}

		$settings = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );

		$theme         = ! empty( $atts['theme'] ) ? sanitize_key( $atts['theme'] ) : ( ! empty( $settings['player_theme'] ) ? $settings['player_theme'] : 'modern_light' );
		$accent_color  = ! empty( $atts['accent'] ) ? sanitize_hex_color( $atts['accent'] ) : ( ! empty( $settings['accent_color'] ) ? $settings['accent_color'] : '#1a73e8' );
		$button_radius = ! empty( $atts['radius'] ) ? sanitize_key( $atts['radius'] ) : ( ! empty( $settings['button_radius'] ) ? $settings['button_radius'] : 'pill' );
		$button_size   = ! empty( $atts['size'] ) ? sanitize_key( $atts['size'] ) : ( ! empty( $settings['button_size'] ) ? $settings['button_size'] : 'medium' );
		$default_rate  = ! empty( $atts['rate'] ) ? floatval( $atts['rate'] ) : ( ! empty( $settings['default_rate'] ) ? floatval( $settings['default_rate'] ) : 1.0 );
		$button_label  = ! empty( $atts['listen_text'] ) ? sanitize_text_field( $atts['listen_text'] ) : ( isset( $settings['button_label'] ) ? $settings['button_label'] : __( 'Listen to this article', 'text-to-speech-player' ) );
		$pause_label   = ! empty( $atts['pause_text'] ) ? sanitize_text_field( $atts['pause_text'] ) : ( ! empty( $settings['pause_text'] ) ? $settings['pause_text'] : __( 'Pause', 'text-to-speech-player' ) );
		$resume_label  = ! empty( $atts['resume_text'] ) ? sanitize_text_field( $atts['resume_text'] ) : ( ! empty( $settings['resume_text'] ) ? $settings['resume_text'] : __( 'Resume', 'text-to-speech-player' ) );
		$replay_label  = ! empty( $atts['replay_text'] ) ? sanitize_text_field( $atts['replay_text'] ) : ( ! empty( $settings['replay_text'] ) ? $settings['replay_text'] : __( 'Listen again', 'text-to-speech-player' ) );

		// Determine custom audio file URL
		$custom_mp3 = '';
		if ( ! empty( $atts['audio_url'] ) ) {
			$custom_mp3 = esc_url_raw( $atts['audio_url'] );
		} elseif ( ! empty( $atts['custom_mp3'] ) ) {
			$custom_mp3 = esc_url_raw( $atts['custom_mp3'] );
		} elseif ( $target_post ) {
			$custom_mp3 = get_post_meta( $target_post->ID, '_tts_player_custom_mp3', true );
		}

		// Determine speakable text and boundaries
		$speakable         = '';
		$body_start_offset = 0;
		$body_end_offset   = 0;
		$intro_text        = '';
		$outro_text        = '';

		if ( ! empty( $content ) ) {
			// Enclosed content mode
			$speakable       = wp_strip_all_tags( $content, true );
			$body_end_offset = mb_strlen( $speakable );
		} elseif ( ! empty( $atts['text_to_read'] ) ) {
			// AtlasVoice text_to_read attribute alias
			$speakable       = sanitize_text_field( $atts['text_to_read'] );
			$body_end_offset = mb_strlen( $speakable );
		} elseif ( ! empty( $atts['text'] ) ) {
			// Direct text attribute
			$speakable       = sanitize_text_field( $atts['text'] );
			$body_end_offset = mb_strlen( $speakable );
		} elseif ( $target_post ) {
			// Extract from target post with precise offsets
			$extractor         = $this->player->get_extractor();
			$extracted_data    = $extractor->extract_with_offsets( $target_post->post_content, $settings, $target_post );
			$alias_engine      = $this->player->get_alias_engine();
			$pre_spoken        = $alias_engine->apply( $extracted_data['pre_text'] );
			$body_spoken       = $alias_engine->apply( $extracted_data['body_text'] );
			$outro_spoken      = $alias_engine->apply( $extracted_data['outro_text'] );

			$all_parts = array();
			if ( '' !== $pre_spoken ) {
				$all_parts[] = $pre_spoken;
			}
			if ( '' !== $body_spoken ) {
				$all_parts[] = $body_spoken;
			}
			if ( '' !== $outro_spoken ) {
				$all_parts[] = $outro_spoken;
			}

			$speakable         = trim( implode( ' ', $all_parts ) );
			$body_start_offset = ( '' !== $pre_spoken ) ? mb_strlen( $pre_spoken . ' ' ) : 0;
			$body_end_offset   = $body_start_offset + mb_strlen( $body_spoken );
			$intro_text        = $extracted_data['intro'];
			$outro_text        = $extracted_data['outro'];
		}

		$post_id = $target_post ? $target_post->ID : 0;

		// Determine sticky positioning attributes
		$is_sticky = false;
		if ( isset( $atts['position'] ) && 'sticky' === $atts['position'] ) {
			$is_sticky = true;
		} elseif ( ! empty( $atts['sticky'] ) && ( 'true' === $atts['sticky'] || '1' === $atts['sticky'] || true === $atts['sticky'] ) ) {
			$is_sticky = true;
		}

		$sticky_position = ! empty( $atts['sticky_position'] ) ? sanitize_key( $atts['sticky_position'] ) : ( ! empty( $settings['sticky_position'] ) ? $settings['sticky_position'] : 'bottom_right' );
		$sticky_offset_x = ( '' !== $atts['offset_x'] ) ? intval( $atts['offset_x'] ) : ( isset( $settings['sticky_offset_x'] ) ? intval( $settings['sticky_offset_x'] ) : 24 );
		$sticky_offset_y = ( '' !== $atts['offset_y'] ) ? intval( $atts['offset_y'] ) : ( isset( $settings['sticky_offset_y'] ) ? intval( $settings['sticky_offset_y'] ) : 24 );

		// Estimated listening time
		$show_listen_time = ( '' !== $atts['show_listen_time'] )
			? ( 'true' === $atts['show_listen_time'] || '1' === $atts['show_listen_time'] )
			: ( ! isset( $settings['show_listen_time'] ) || ! empty( $settings['show_listen_time'] ) );

		$word_count = count( preg_split( '/\s+/', trim( wp_strip_all_tags( $speakable ) ) ) );
		$minutes    = max( 1, (int) ceil( $word_count / 140 ) );
		/* translators: %d: Estimated listening time in minutes */
		$listen_time_badge = sprintf( _n( '%d min listen', '%d min listen', $minutes, 'text-to-speech-player' ), $minutes );

		$enable_download = ( '' !== $atts['download'] )
			? ( 'true' === $atts['download'] || '1' === $atts['download'] )
			: ( ! empty( $settings['enable_download_button'] ) );

		// Ensure player runtime scripts & styles are enqueued whenever shortcode is used
		$this->player->enqueue_player_assets( $target_post );

		ob_start();
		tts_player_get_template( 'player-bar.php', array(
			'post_id'           => $post_id,
			'post_title'        => $target_post ? get_the_title( $target_post ) : get_bloginfo( 'name' ),
			'featured_image'    => ( $target_post && has_post_thumbnail( $target_post->ID ) ) ? (string) get_the_post_thumbnail_url( $target_post->ID, 'large' ) : '',
			'button_label'      => $button_label,
			'player_theme'      => $theme,
			'accent_color'      => $accent_color,
			'button_radius'     => $button_radius,
			'button_size'       => $button_size,
			'speakable_text'    => $speakable,
			'body_start_offset' => $body_start_offset,
			'body_end_offset'   => $body_end_offset,
			'intro_text'        => $intro_text,
			'outro_text'        => $outro_text,
			'custom_mp3'        => $custom_mp3,
			'default_rate'      => $default_rate,
			'is_sticky'         => $is_sticky,
			'sticky_position'   => $sticky_position,
			'sticky_offset_x'   => $sticky_offset_x,
			'sticky_offset_y'   => $sticky_offset_y,
			'listen_text'       => $button_label,
			'pause_text'        => $pause_label,
			'resume_text'       => $resume_label,
			'replay_text'       => $replay_label,
			'show_listen_time'  => $show_listen_time,
			'listen_time_badge' => $listen_time_badge,
			'enable_download'   => $enable_download,
		) );
		return ob_get_clean();
	}
}
