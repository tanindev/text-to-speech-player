<?php
namespace TextToSpeechPlayer\Helpers;

defined( 'ABSPATH' ) || exit;

/**
 * Template Loader with Theme Overrides.
 */
class Template {

	/**
	 * Load a template file with args.
	 *
	 * @param string $template_name
	 * @param array  $args
	 * @param string $template_path
	 * @param string $default_path
	 */
	public static function get_template( $template_name, $args = array(), $template_path = '', $default_path = '' ) {
		if ( ! empty( $args ) && is_array( $args ) ) {
			extract( $args, EXTR_SKIP ); // phpcs:ignore WordPress.PHP.DontExtract.extract_extract
		}

		$located = self::locate_template( $template_name, $template_path, $default_path );

		if ( ! file_exists( $located ) ) {
			return;
		}

		include $located;
	}

	/**
	 * Locate a template in theme or fallback to plugin.
	 *
	 * @param string $template_name
	 * @param string $template_path
	 * @param string $default_path
	 * @return string
	 */
	public static function locate_template( $template_name, $template_path = '', $default_path = '' ) {
		if ( ! $template_path ) {
			$template_path = 'text-to-speech-player/';
		}

		if ( ! $default_path ) {
			$default_path = TTS_PLAYER_PATH . 'templates/';
		}

		$template = locate_template( array(
			trailingslashit( $template_path ) . $template_name,
			$template_name,
		) );

		if ( ! $template ) {
			$template = $default_path . $template_name;
		}

		return apply_filters( 'tts_player_locate_template', $template, $template_name, $template_path );
	}
}
