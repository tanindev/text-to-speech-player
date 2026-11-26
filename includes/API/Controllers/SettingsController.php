<?php
namespace TextToSpeechPlayer\API\Controllers;

defined( 'ABSPATH' ) || exit;

/**
 * Settings REST API Controller.
 */
class SettingsController {

	/**
	 * Register REST routes for settings.
	 */
	public function register_routes() {
		register_rest_route(
			'text-to-speech-player/v1',
			'/settings',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'update_settings' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);

		register_rest_route(
			'text-to-speech-player/v1',
			'/settings/reset',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'reset_settings' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);

		register_rest_route(
			'text-to-speech-player/v1',
			'/settings/import',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'import_settings' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);
	}

	/**
	 * Default settings array.
	 *
	 * @return array
	 */
	public function get_default_settings() {
		return array(
			'enabled_post_types'        => array( 'post', 'page' ),
			'player_position'          => 'before_content',
			'sticky_position'          => 'bottom_right',
			'sticky_offset_x'          => 24,
			'sticky_offset_y'          => 24,
			'disable_on_front_page'     => false,
			'enable_floating_dock'      => true,
			'floating_dock_position'    => 'bottom_right',
			'enable_selection_reader'   => true,
			'player_theme'              => 'modern_light',
			'accent_color'              => '#1a73e8',
			'button_radius'             => 'pill',
			'button_size'               => 'medium',
			'button_label'              => __( 'Listen to this article', 'text-to-speech-player' ),
			'show_listen_time'          => true,
			'enable_download_button'    => false,
			'enable_keyboard_shortcuts' => true,
			'theme_preset'              => 'auto',
			'default_engine'            => 'browser',
			'default_voice'             => '',
			'default_rate'              => 1.0,
			'default_pitch'             => 1.0,
			'enable_highlighting'       => true,
			'highlight_color'           => '#fef08a',
			'highlight_mode'            => 'word',
			'highlight_sentence_bg'     => '#e8e7fe',
			'dim_enabled'               => true,
			'dim_opacity'               => 0.7,
			'listen_text'               => __( 'Listen to this article', 'text-to-speech-player' ),
			'pause_text'                => __( 'Pause', 'text-to-speech-player' ),
			'resume_text'               => __( 'Resume', 'text-to-speech-player' ),
			'replay_text'               => __( 'Listen again', 'text-to-speech-player' ),
			'stop_on_tab_switch'        => true,
			'display_player_to'         => array( 'all' ),
			'css_selectors'             => '',
			'exclude_css_selectors'     => '',
			'exclude_tags'              => 'aside|figure|script|style|figcaption|code|pre',
			'exclude_texts'             => '',
			'exclude_categories'        => array(),
			'exclude_wp_tags'           => array(),
			'exclude_post_ids'          => '',
			'include_post_title'        => false,
			'include_post_excerpt'      => false,
			'text_before_content'       => '',
			'text_after_content'        => '',
			'read_content_from_dom'     => false,
			'active_ai_provider'        => 'openai',
			'openai_api_key'            => '',
			'openai_model'              => 'tts-1',
			'openai_voice'              => 'alloy',
			'elevenlabs_api_key'        => '',
			'elevenlabs_model'          => 'eleven_multilingual_v2',
			'elevenlabs_voice_id'       => '21m00Tcm4TlvDq8ikWAM',
			'elevenlabs_stability'      => 0.5,
			'elevenlabs_similarity'     => 0.75,
			'google_tts_api_key'        => '',
			'google_tts_voice'          => 'en-US-Journey-F',
			'google_tts_lang'           => 'en-US',
			'polly_access_key'          => '',
			'polly_secret_key'          => '',
			'polly_region'              => 'us-east-1',
			'polly_engine'              => 'neural',
			'polly_voice_id'            => 'Joanna',
			'custom_ai_name'            => 'Custom / Self-Hosted',
			'custom_ai_endpoint'        => '',
			'custom_ai_api_key'         => '',
			'custom_ai_model'           => 'tts-1',
			'custom_ai_voice'           => 'default',
			'enable_audio_schema'       => true,
			'delete_data_on_uninstall'  => false,
		);
	}

	/**
	 * Reset settings to factory defaults.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response
	 */
	public function reset_settings( $request ) {
		$defaults = $this->get_default_settings();
		update_option( TTS_PLAYER_OPTION_SETTINGS, $defaults );
		return rest_ensure_response( array(
			'success'  => true,
			'message'  => __( 'All settings reset to factory defaults successfully.', 'text-to-speech-player' ),
			'settings' => $defaults,
		) );
	}

	/**
	 * Import settings.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function import_settings( $request ) {
		$params = $request->get_json_params();
		$import_settings = ! empty( $params['settings'] ) && is_array( $params['settings'] ) ? $params['settings'] : $params;
		if ( empty( $import_settings ) || ! is_array( $import_settings ) ) {
			return new \WP_Error( 'invalid_data', __( 'Invalid or empty settings data provided.', 'text-to-speech-player' ), array( 'status' => 400 ) );
		}

		$req = new \WP_REST_Request( 'POST', '/text-to-speech-player/v1/settings' );
		$req->set_header( 'content-type', 'application/json' );
		$req->set_body( wp_json_encode( $import_settings ) );

		return $this->update_settings( $req );
	}

	/**
	 * Permission check.
	 *
	 * @return bool
	 */
	public function permissions_check() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Get current settings.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response
	 */
	public function get_settings( $request ) {
		$settings = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );
		return rest_ensure_response( array(
			'success'  => true,
			'settings' => $settings,
		) );
	}

	/**
	 * Update settings.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_settings( $request ) {
		$params   = $request->get_json_params();
		$existing = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );

		$sanitized = array();

		// Post Types
		if ( isset( $params['enabled_post_types'] ) && is_array( $params['enabled_post_types'] ) ) {
			$sanitized['enabled_post_types'] = array_map( 'sanitize_key', $params['enabled_post_types'] );
		} else {
			$sanitized['enabled_post_types'] = ! empty( $existing['enabled_post_types'] ) ? $existing['enabled_post_types'] : array( 'post' );
		}

		// Strings & Selects
		$sanitized['player_position']        = ! empty( $params['player_position'] ) ? sanitize_key( $params['player_position'] ) : 'before_content';
		$sanitized['sticky_position']        = ! empty( $params['sticky_position'] ) ? sanitize_key( $params['sticky_position'] ) : 'bottom_right';
		$sanitized['sticky_offset_x']        = isset( $params['sticky_offset_x'] ) ? intval( $params['sticky_offset_x'] ) : 24;
		$sanitized['sticky_offset_y']        = isset( $params['sticky_offset_y'] ) ? intval( $params['sticky_offset_y'] ) : 24;
		$sanitized['disable_on_front_page']   = ! empty( $params['disable_on_front_page'] );
		$sanitized['show_listen_time']        = isset( $params['show_listen_time'] ) ? ! empty( $params['show_listen_time'] ) : true;
		$sanitized['enable_download_button']  = ! empty( $params['enable_download_button'] );
		$sanitized['enable_keyboard_shortcuts'] = isset( $params['enable_keyboard_shortcuts'] ) ? ! empty( $params['enable_keyboard_shortcuts'] ) : true;
		$sanitized['theme_preset']            = ! empty( $params['theme_preset'] ) ? sanitize_key( $params['theme_preset'] ) : 'auto';
		$sanitized['enable_floating_dock']    = ! empty( $params['enable_floating_dock'] );
		$sanitized['floating_dock_position']  = ! empty( $params['floating_dock_position'] ) ? sanitize_key( $params['floating_dock_position'] ) : 'bottom_right';
		$sanitized['enable_selection_reader'] = ! empty( $params['enable_selection_reader'] );
		$sanitized['player_theme']            = ! empty( $params['player_theme'] ) ? sanitize_key( $params['player_theme'] ) : 'modern_light';
		$sanitized['accent_color']            = ! empty( $params['accent_color'] ) ? sanitize_hex_color( $params['accent_color'] ) : '#1a73e8';
		$sanitized['button_radius']           = ! empty( $params['button_radius'] ) ? sanitize_key( $params['button_radius'] ) : 'pill';
		$sanitized['button_size']             = ! empty( $params['button_size'] ) ? sanitize_key( $params['button_size'] ) : 'medium';
		$sanitized['button_label']            = isset( $params['button_label'] ) ? sanitize_text_field( $params['button_label'] ) : __( 'Listen to this article', 'text-to-speech-player' );
		$sanitized['default_engine']          = ! empty( $params['default_engine'] ) ? sanitize_key( $params['default_engine'] ) : 'browser';
		$sanitized['default_voice']           = ! empty( $params['default_voice'] ) ? sanitize_text_field( $params['default_voice'] ) : '';
		$sanitized['default_rate']            = isset( $params['default_rate'] ) ? floatval( $params['default_rate'] ) : 1.0;
		$sanitized['default_pitch']           = isset( $params['default_pitch'] ) ? floatval( $params['default_pitch'] ) : 1.0;
		$sanitized['enable_highlighting']     = ! empty( $params['enable_highlighting'] );
		$sanitized['highlight_color']         = ! empty( $params['highlight_color'] ) ? sanitize_hex_color( $params['highlight_color'] ) : '#fef08a';
		$sanitized['highlight_mode']          = ! empty( $params['highlight_mode'] ) ? sanitize_key( $params['highlight_mode'] ) : 'word';
		$sanitized['highlight_sentence_bg']   = ! empty( $params['highlight_sentence_bg'] ) ? sanitize_hex_color( $params['highlight_sentence_bg'] ) : '#e8e7fe';
		$sanitized['dim_enabled']             = ! empty( $params['dim_enabled'] );
		$sanitized['dim_opacity']             = isset( $params['dim_opacity'] ) ? floatval( $params['dim_opacity'] ) : 0.7;

		// Button Text States & Inactivity
		$sanitized['listen_text']             = ! empty( $params['listen_text'] ) ? sanitize_text_field( $params['listen_text'] ) : __( 'Listen to this article', 'text-to-speech-player' );
		$sanitized['pause_text']              = ! empty( $params['pause_text'] ) ? sanitize_text_field( $params['pause_text'] ) : __( 'Pause', 'text-to-speech-player' );
		$sanitized['resume_text']             = ! empty( $params['resume_text'] ) ? sanitize_text_field( $params['resume_text'] ) : __( 'Resume', 'text-to-speech-player' );
		$sanitized['replay_text']             = ! empty( $params['replay_text'] ) ? sanitize_text_field( $params['replay_text'] ) : __( 'Listen again', 'text-to-speech-player' );
		$sanitized['stop_on_tab_switch']      = ! empty( $params['stop_on_tab_switch'] );
		$sanitized['display_player_to']       = ! empty( $params['display_player_to'] ) && is_array( $params['display_player_to'] ) ? array_map( 'sanitize_key', $params['display_player_to'] ) : array( 'all' );

		// Content Filtering & Exclusions
		$sanitized['css_selectors']           = ! empty( $params['css_selectors'] ) ? sanitize_text_field( $params['css_selectors'] ) : '';
		$sanitized['exclude_css_selectors']   = ! empty( $params['exclude_css_selectors'] ) ? sanitize_text_field( $params['exclude_css_selectors'] ) : '';
		$sanitized['exclude_tags']            = ! empty( $params['exclude_tags'] ) ? sanitize_text_field( $params['exclude_tags'] ) : 'aside|figure|blockquote|script|style|figcaption|code|pre';
		$sanitized['exclude_texts']           = isset( $params['exclude_texts'] ) ? sanitize_textarea_field( $params['exclude_texts'] ) : '';
		$sanitized['exclude_categories']      = ! empty( $params['exclude_categories'] ) && is_array( $params['exclude_categories'] ) ? array_map( 'absint', $params['exclude_categories'] ) : array();
		$sanitized['exclude_wp_tags']         = ! empty( $params['exclude_wp_tags'] ) && is_array( $params['exclude_wp_tags'] ) ? array_map( 'absint', $params['exclude_wp_tags'] ) : array();
		$sanitized['exclude_post_ids']        = isset( $params['exclude_post_ids'] ) ? sanitize_text_field( $params['exclude_post_ids'] ) : '';
		$sanitized['include_post_title']      = ! empty( $params['include_post_title'] );
		$sanitized['include_post_excerpt']    = ! empty( $params['include_post_excerpt'] );
		$sanitized['text_before_content']     = isset( $params['text_before_content'] ) ? sanitize_text_field( $params['text_before_content'] ) : '';
		$sanitized['text_after_content']      = isset( $params['text_after_content'] ) ? sanitize_text_field( $params['text_after_content'] ) : '';
		$sanitized['read_content_from_dom']   = ! empty( $params['read_content_from_dom'] );

		// Active AI Provider
		$sanitized['active_ai_provider']      = ! empty( $params['active_ai_provider'] ) ? sanitize_key( $params['active_ai_provider'] ) : 'openai';

		// OpenAI
		$sanitized['openai_api_key']          = ! empty( $params['openai_api_key'] ) ? sanitize_text_field( $params['openai_api_key'] ) : '';
		$sanitized['openai_model']            = ! empty( $params['openai_model'] ) ? sanitize_text_field( $params['openai_model'] ) : 'tts-1';
		$sanitized['openai_voice']            = ! empty( $params['openai_voice'] ) ? sanitize_key( $params['openai_voice'] ) : 'alloy';

		// ElevenLabs
		$sanitized['elevenlabs_api_key']      = ! empty( $params['elevenlabs_api_key'] ) ? sanitize_text_field( $params['elevenlabs_api_key'] ) : '';
		$sanitized['elevenlabs_model']        = ! empty( $params['elevenlabs_model'] ) ? sanitize_text_field( $params['elevenlabs_model'] ) : 'eleven_multilingual_v2';
		$sanitized['elevenlabs_voice_id']     = ! empty( $params['elevenlabs_voice_id'] ) ? sanitize_text_field( $params['elevenlabs_voice_id'] ) : '21m00Tcm4TlvDq8ikWAM';
		$sanitized['elevenlabs_stability']    = isset( $params['elevenlabs_stability'] ) ? floatval( $params['elevenlabs_stability'] ) : 0.5;
		$sanitized['elevenlabs_similarity']   = isset( $params['elevenlabs_similarity'] ) ? floatval( $params['elevenlabs_similarity'] ) : 0.75;

		// Google Cloud Text-to-Speech
		$sanitized['google_tts_api_key']      = ! empty( $params['google_tts_api_key'] ) ? sanitize_text_field( $params['google_tts_api_key'] ) : '';
		$sanitized['google_tts_voice']        = ! empty( $params['google_tts_voice'] ) ? sanitize_text_field( $params['google_tts_voice'] ) : 'en-US-Journey-F';
		$sanitized['google_tts_lang']         = ! empty( $params['google_tts_lang'] ) ? sanitize_text_field( $params['google_tts_lang'] ) : 'en-US';

		// Amazon Polly
		$sanitized['polly_access_key']        = ! empty( $params['polly_access_key'] ) ? sanitize_text_field( $params['polly_access_key'] ) : '';
		$sanitized['polly_secret_key']        = ! empty( $params['polly_secret_key'] ) ? sanitize_text_field( $params['polly_secret_key'] ) : '';
		$sanitized['polly_region']            = ! empty( $params['polly_region'] ) ? sanitize_text_field( $params['polly_region'] ) : 'us-east-1';
		$sanitized['polly_engine']            = ! empty( $params['polly_engine'] ) ? sanitize_key( $params['polly_engine'] ) : 'neural';
		$sanitized['polly_voice_id']          = ! empty( $params['polly_voice_id'] ) ? sanitize_text_field( $params['polly_voice_id'] ) : 'Joanna';

		// Custom AI Provider (OpenAI Compatible / REST API / Self-Hosted)
		$sanitized['custom_ai_name']          = ! empty( $params['custom_ai_name'] ) ? sanitize_text_field( $params['custom_ai_name'] ) : 'Custom / Self-Hosted';
		$sanitized['custom_ai_endpoint']      = ! empty( $params['custom_ai_endpoint'] ) ? esc_url_raw( $params['custom_ai_endpoint'] ) : '';
		$sanitized['custom_ai_api_key']       = ! empty( $params['custom_ai_api_key'] ) ? sanitize_text_field( $params['custom_ai_api_key'] ) : '';
		$sanitized['custom_ai_model']         = ! empty( $params['custom_ai_model'] ) ? sanitize_text_field( $params['custom_ai_model'] ) : 'tts-1';
		$sanitized['custom_ai_voice']         = ! empty( $params['custom_ai_voice'] ) ? sanitize_text_field( $params['custom_ai_voice'] ) : 'default';

		$sanitized['enable_audio_schema']     = ! empty( $params['enable_audio_schema'] );
		$sanitized['delete_data_on_uninstall']= ! empty( $params['delete_data_on_uninstall'] );

		update_option( TTS_PLAYER_OPTION_SETTINGS, $sanitized );

		return rest_ensure_response( array(
			'success'  => true,
			'message'  => __( 'Settings updated successfully.', 'text-to-speech-player' ),
			'settings' => $sanitized,
		) );
	}
}
