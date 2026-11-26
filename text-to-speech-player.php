<?php
/**
 * Plugin Name:       Text to Speech Player – AI TTS & Audio Reader
 * Plugin URI:        https://github.com/tanindev/text-to-speech-player
 * Description:       Convert posts, pages, and products into natural-sounding speech with browser voices and cloud AI (OpenAI, Google Cloud, ElevenLabs).
 * Version:           1.0.0
 * Author:            Tanin's Dev
 * Author URI:        https://profiles.wordpress.org/tanindev/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       text-to-speech-player
 * Domain Path:       /languages
 * Requires at least: 6.2
 * Requires PHP:      7.4
 */

defined( 'ABSPATH' ) || exit;

define( 'TTS_PLAYER_VERSION', '1.0.0' );
define( 'TTS_PLAYER_FILE', __FILE__ );
define( 'TTS_PLAYER_PATH', plugin_dir_path( __FILE__ ) );
define( 'TTS_PLAYER_URL', plugin_dir_url( __FILE__ ) );
define( 'TTS_PLAYER_ASSETS_URL', TTS_PLAYER_URL . 'assets/' );

if ( ! defined( 'TTS_PLAYER_OPTION_SETTINGS' ) ) {
	define( 'TTS_PLAYER_OPTION_SETTINGS', 'tts_player_settings' );
}

if ( ! defined( 'TTS_PLAYER_OPTION_ALIASES' ) ) {
	define( 'TTS_PLAYER_OPTION_ALIASES', 'tts_player_aliases' );
}

/**
 * Autoloader for Plugin Classes.
 */
spl_autoload_register( function ( $class ) {
	$prefix   = 'TextToSpeechPlayer\\';
	$base_dir = TTS_PLAYER_PATH . 'includes/';

	$len = strlen( $prefix );
	if ( strncmp( $prefix, $class, $len ) !== 0 ) {
		return;
	}

	$relative_class = substr( $class, $len );
	$file           = $base_dir . str_replace( '\\', '/', $relative_class ) . '.php';

	if ( file_exists( $file ) ) {
		require_once $file;
	}
} );

/**
 * Initialize Plugin Singleton.
 */
function tts_player_init_plugin() {
	\TextToSpeechPlayer\Plugin::instance();
}
add_action( 'plugins_loaded', 'tts_player_init_plugin' );

/**
 * Activation Hook.
 */
register_activation_hook( __FILE__, function () {
	if ( false === get_option( TTS_PLAYER_OPTION_SETTINGS ) ) {
		$controller = new \TextToSpeechPlayer\API\Controllers\SettingsController();
		update_option( TTS_PLAYER_OPTION_SETTINGS, $controller->get_default_settings(), false );
	}
} );

/**
 * Deactivation Hook.
 */
register_deactivation_hook( __FILE__, function () {
	\TextToSpeechPlayer\Helpers\Cache::flush_all();
} );

/**
 * Load a template file with args and allow theme overrides.
 *
 * @param string $template_name Template name (e.g. 'player-bar.php').
 * @param array  $args          Template variables.
 * @param string $template_path Custom template path within theme.
 * @param string $default_path  Fallback directory in plugin.
 */
function tts_player_get_template( $template_name, $args = array(), $template_path = '', $default_path = '' ) {
	\TextToSpeechPlayer\Helpers\Template::get_template( $template_name, $args, $template_path, $default_path );
}

/**
 * Locate a template file path checking theme override first.
 *
 * @param string $template_name Template name.
 * @param string $template_path Custom template path within theme.
 * @param string $default_path  Fallback directory in plugin.
 * @return string
 */
function tts_player_locate_template( $template_name, $template_path = '', $default_path = '' ) {
	return \TextToSpeechPlayer\Helpers\Template::locate_template( $template_name, $template_path, $default_path );
}
