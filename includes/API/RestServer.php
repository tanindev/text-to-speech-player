<?php
namespace TextToSpeechPlayer\API;

defined( 'ABSPATH' ) || exit;

/**
 * REST Server Controller.
 */
class RestServer {

	const NAMESPACE = 'text-to-speech-player/v1';

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register all REST API routes.
	 */
	public function register_routes() {
		$settings_controller      = new Controllers\SettingsController();
		$speech_controller        = new Controllers\SpeechController();
		$pronunciation_controller = new Controllers\PronunciationController();
		$analytics_controller     = new Controllers\AnalyticsController();

		$settings_controller->register_routes();
		$speech_controller->register_routes();
		$pronunciation_controller->register_routes();
		$analytics_controller->register_routes();
	}
}
