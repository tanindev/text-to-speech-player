<?php
namespace TextToSpeechPlayer\Services;

defined( 'ABSPATH' ) || exit;

/**
 * AudioObject JSON-LD Schema Generator for Audio SEO.
 */
class AudioSchema {

	/**
	 * Output JSON-LD schema in wp_head on single view.
	 */
	public function render_schema() {
		if ( ! is_singular() ) {
			return;
		}

		$settings = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );
		if ( empty( $settings['enable_audio_schema'] ) ) {
			return;
		}

		global $post;
		if ( ! $post || get_post_meta( $post->ID, '_tts_player_disable', true ) ) {
			return;
		}

		$schema = array(
			'@context'    => 'https://schema.org',
			'@type'       => 'AudioObject',
			'name'        => get_the_title( $post ),
			'description' => wp_strip_all_tags( get_the_excerpt( $post ) ),
			'url'         => get_permalink( $post ),
			'encodingFormat' => 'audio/mpeg',
		);

		echo "\n<!-- Text to Speech Player Audio Schema -->\n";
		wp_print_inline_script_tag(
			wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT ),
			array( 'type' => 'application/ld+json' )
		);
	}
}
