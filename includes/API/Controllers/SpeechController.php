<?php
namespace TextToSpeechPlayer\API\Controllers;

defined( 'ABSPATH' ) || exit;

/**
 * Speech Synthesis Controller (AI Audio Generation & Proxy).
 */
class SpeechController {

	/**
	 * Register routes.
	 */
	public function register_routes() {
		register_rest_route(
			'text-to-speech-player/v1',
			'/speech/synthesize',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'synthesize_speech' ),
				'permission_callback' => array( $this, 'permissions_check' ),
				'args'                => array(
					'provider' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_key',
					),
					'text'     => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'model'    => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'voice'    => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'voice_id' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Check permission for synthesis API.
	 *
	 * @return bool
	 */
	public function permissions_check() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Synthesize speech via configured AI provider.
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function synthesize_speech( $request ) {
		$params   = $request->get_json_params();
		$settings = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );

		$provider = ! empty( $params['provider'] ) ? sanitize_key( $params['provider'] ) : ( ! empty( $settings['active_ai_provider'] ) ? $settings['active_ai_provider'] : 'openai' );
		$text     = ! empty( $params['text'] ) ? sanitize_text_field( $params['text'] ) : 'Welcome to our website. Enjoy listening to this article!';

		$start_time = microtime( true );

		switch ( $provider ) {
			case 'openai':
				return $this->synthesize_openai( $text, $params, $settings, $start_time );

			case 'elevenlabs':
				return $this->synthesize_elevenlabs( $text, $params, $settings, $start_time );

			case 'google':
				return $this->synthesize_google( $text, $params, $settings, $start_time );

			case 'polly':
				return $this->synthesize_polly( $text, $params, $settings, $start_time );

			case 'custom':
				return $this->synthesize_custom( $text, $params, $settings, $start_time );

			default:
				return new \WP_Error(
					'invalid_provider',
					__( 'Unsupported AI provider specified.', 'text-to-speech-player' ),
					array( 'status' => 400 )
				);
		}
	}

	/**
	 * OpenAI Text to Speech API.
	 */
	protected function synthesize_openai( $text, $params, $settings, $start_time ) {
		$api_key = ! empty( $params['api_key'] ) ? sanitize_text_field( $params['api_key'] ) : ( ! empty( $settings['openai_api_key'] ) ? $settings['openai_api_key'] : '' );
		$model   = ! empty( $params['model'] ) ? sanitize_text_field( $params['model'] ) : ( ! empty( $settings['openai_model'] ) ? $settings['openai_model'] : 'tts-1' );
		$voice   = ! empty( $params['voice'] ) ? sanitize_key( $params['voice'] ) : ( ! empty( $settings['openai_voice'] ) ? $settings['openai_voice'] : 'alloy' );

		if ( empty( $api_key ) ) {
			return new \WP_Error(
				'missing_api_key',
				__( 'Please provide a valid OpenAI API key in settings.', 'text-to-speech-player' ),
				array( 'status' => 400 )
			);
		}

		// phpcs:ignore PluginCheck.CodeAnalysis.AIProvider.DirectIntegration -- Supports WP 5.8+ and BYOK OpenAI TTS audio endpoint.
		$response = wp_remote_post( 'https://api.openai.com/v1/audio/speech', array(
			'timeout' => 30,
			'headers' => array(
				'Authorization' => 'Bearer ' . $api_key,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'model' => $model,
				'input' => $text,
				'voice' => $voice,
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body        = wp_remote_retrieve_body( $response );

		if ( 200 !== $status_code ) {
			$json = json_decode( $body, true );
			/* translators: %d: HTTP status code. */
			$msg  = ! empty( $json['error']['message'] ) ? sanitize_text_field( $json['error']['message'] ) : sprintf( __( 'OpenAI API returned error code %d.', 'text-to-speech-player' ), $status_code );
			return new \WP_Error( 'openai_api_error', $msg, array( 'status' => $status_code ) );
		}

		$latency   = round( ( microtime( true ) - $start_time ) * 1000 );
		$audio_uri = 'data:audio/mp3;base64,' . base64_encode( $body );

		return rest_ensure_response( array(
			'success'   => true,
			'provider'  => 'openai',
			'audio_url' => $audio_uri,
			'model'     => $model,
			'voice'     => $voice,
			'latency'   => $latency,
			/* translators: %d: Latency duration in milliseconds. */
			'message'   => sprintf( __( 'OpenAI synthesis succeeded in %d ms.', 'text-to-speech-player' ), $latency ),
		) );
	}

	/**
	 * ElevenLabs Text to Speech API.
	 */
	protected function synthesize_elevenlabs( $text, $params, $settings, $start_time ) {
		$api_key  = ! empty( $params['api_key'] ) ? sanitize_text_field( $params['api_key'] ) : ( ! empty( $settings['elevenlabs_api_key'] ) ? $settings['elevenlabs_api_key'] : '' );
		$voice_id = ! empty( $params['voice_id'] ) ? sanitize_text_field( $params['voice_id'] ) : ( ! empty( $settings['elevenlabs_voice_id'] ) ? $settings['elevenlabs_voice_id'] : '21m00Tcm4TlvDq8ikWAM' );
		$model_id = ! empty( $params['model'] ) ? sanitize_text_field( $params['model'] ) : ( ! empty( $settings['elevenlabs_model'] ) ? $settings['elevenlabs_model'] : 'eleven_multilingual_v2' );

		if ( empty( $api_key ) ) {
			return new \WP_Error(
				'missing_api_key',
				__( 'Please provide a valid ElevenLabs API key in settings.', 'text-to-speech-player' ),
				array( 'status' => 400 )
			);
		}

		$endpoint = sprintf( 'https://api.elevenlabs.io/v1/text-to-speech/%s', rawurlencode( $voice_id ) );

		$response = wp_remote_post( $endpoint, array(
			'timeout' => 30,
			'headers' => array(
				'xi-api-key'   => $api_key,
				'Content-Type' => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'text'           => $text,
				'model_id'       => $model_id,
				'voice_settings' => array(
					'stability'        => isset( $settings['elevenlabs_stability'] ) ? floatval( $settings['elevenlabs_stability'] ) : 0.5,
					'similarity_boost' => isset( $settings['elevenlabs_similarity'] ) ? floatval( $settings['elevenlabs_similarity'] ) : 0.75,
				),
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body        = wp_remote_retrieve_body( $response );

		if ( 200 !== $status_code ) {
			$json = json_decode( $body, true );
			/* translators: %d: HTTP status code. */
			$msg  = ! empty( $json['detail']['message'] ) ? sanitize_text_field( $json['detail']['message'] ) : sprintf( __( 'ElevenLabs API returned error code %d.', 'text-to-speech-player' ), $status_code );
			return new \WP_Error( 'elevenlabs_api_error', $msg, array( 'status' => $status_code ) );
		}

		$latency   = round( ( microtime( true ) - $start_time ) * 1000 );
		$audio_uri = 'data:audio/mp3;base64,' . base64_encode( $body );

		return rest_ensure_response( array(
			'success'   => true,
			'provider'  => 'elevenlabs',
			'audio_url' => $audio_uri,
			'model'     => $model_id,
			'voice'     => $voice_id,
			'latency'   => $latency,
			/* translators: %d: Latency duration in milliseconds. */
			'message'   => sprintf( __( 'ElevenLabs synthesis succeeded in %d ms.', 'text-to-speech-player' ), $latency ),
		) );
	}

	/**
	 * Google Cloud Text-to-Speech API.
	 */
	protected function synthesize_google( $text, $params, $settings, $start_time ) {
		$api_key = ! empty( $params['api_key'] ) ? sanitize_text_field( $params['api_key'] ) : ( ! empty( $settings['google_tts_api_key'] ) ? $settings['google_tts_api_key'] : '' );
		$voice   = ! empty( $params['voice'] ) ? sanitize_text_field( $params['voice'] ) : ( ! empty( $settings['google_tts_voice'] ) ? $settings['google_tts_voice'] : 'en-US-Journey-F' );
		$lang    = ! empty( $params['lang'] ) ? sanitize_text_field( $params['lang'] ) : ( ! empty( $settings['google_tts_lang'] ) ? $settings['google_tts_lang'] : 'en-US' );

		if ( empty( $api_key ) ) {
			return new \WP_Error(
				'missing_api_key',
				__( 'Please provide a Google Cloud Text-to-Speech API key.', 'text-to-speech-player' ),
				array( 'status' => 400 )
			);
		}

		$endpoint = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' . urlencode( $api_key );

		$response = wp_remote_post( $endpoint, array(
			'timeout' => 30,
			'headers' => array(
				'Content-Type' => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'input'       => array( 'text' => $text ),
				'voice'       => array(
					'languageCode' => $lang,
					'name'         => $voice,
				),
				'audioConfig' => array(
					'audioEncoding' => 'MP3',
				),
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body        = wp_remote_retrieve_body( $response );
		$json        = json_decode( $body, true );

		if ( 200 !== $status_code || empty( $json['audioContent'] ) ) {
			/* translators: %d: HTTP status code. */
			$msg = ! empty( $json['error']['message'] ) ? sanitize_text_field( $json['error']['message'] ) : sprintf( __( 'Google Cloud TTS returned error code %d.', 'text-to-speech-player' ), $status_code );
			return new \WP_Error( 'google_tts_error', $msg, array( 'status' => $status_code ) );
		}

		$latency   = round( ( microtime( true ) - $start_time ) * 1000 );
		$audio_uri = 'data:audio/mp3;base64,' . $json['audioContent'];

		return rest_ensure_response( array(
			'success'   => true,
			'provider'  => 'google',
			'audio_url' => $audio_uri,
			'voice'     => $voice,
			'latency'   => $latency,
			/* translators: %d: Latency duration in milliseconds. */
			'message'   => sprintf( __( 'Google Cloud TTS synthesis succeeded in %d ms.', 'text-to-speech-player' ), $latency ),
		) );
	}

	/**
	 * Amazon Polly Text-to-Speech API (AWS Signature Version 4).
	 */
	protected function synthesize_polly( $text, $params, $settings, $start_time ) {
		$access_key = ! empty( $settings['polly_access_key'] ) ? $settings['polly_access_key'] : '';
		$secret_key = ! empty( $settings['polly_secret_key'] ) ? $settings['polly_secret_key'] : '';
		$region     = ! empty( $settings['polly_region'] ) ? sanitize_key( $settings['polly_region'] ) : 'us-east-1';
		$voice_id   = ! empty( $settings['polly_voice_id'] ) ? sanitize_text_field( $settings['polly_voice_id'] ) : 'Joanna';
		$engine     = ! empty( $settings['polly_engine'] ) ? sanitize_key( $settings['polly_engine'] ) : 'neural';

		if ( empty( $access_key ) || empty( $secret_key ) ) {
			return new \WP_Error(
				'missing_credentials',
				__( 'Please provide Amazon Polly AWS Access Key ID and Secret Access Key.', 'text-to-speech-player' ),
				array( 'status' => 400 )
			);
		}

		// phpcs:ignore PluginCheck.CodeAnalysis.Offloading.OffloadedContent -- Amazon Polly BYOK REST API endpoint, not offloaded assets.
		$host     = "polly.{$region}.amazonaws.com";
		$endpoint = "https://{$host}/v1/speech";
		$payload  = wp_json_encode( array(
			'Engine'       => $engine,
			'OutputFormat' => 'mp3',
			'Text'         => $text,
			'VoiceId'      => $voice_id,
		) );

		$amz_date   = gmdate( 'Ymd\THis\Z' );
		$date_stamp = gmdate( 'Ymd' );
		$service    = 'polly';

		$canonical_headers = "content-type:application/json\nhost:{$host}\nx-amz-date:{$amz_date}\n";
		$signed_headers    = 'content-type;host;x-amz-date';
		$payload_hash      = hash( 'sha256', $payload );
		$canonical_request = "POST\n/v1/speech\n\n{$canonical_headers}\n{$signed_headers}\n{$payload_hash}";

		$credential_scope = "{$date_stamp}/{$region}/{$service}/aws4_request";
		$string_to_sign   = "AWS4-HMAC-SHA256\n{$amz_date}\n{$credential_scope}\n" . hash( 'sha256', $canonical_request );

		$k_date    = hash_hmac( 'sha256', $date_stamp, 'AWS4' . $secret_key, true );
		$k_region  = hash_hmac( 'sha256', $region, $k_date, true );
		$k_service = hash_hmac( 'sha256', $service, $k_region, true );
		$k_signing = hash_hmac( 'sha256', 'aws4_request', $k_service, true );
		$signature = hash_hmac( 'sha256', $string_to_sign, $k_signing );

		$authorization = "AWS4-HMAC-SHA256 Credential={$access_key}/{$credential_scope}, SignedHeaders={$signed_headers}, Signature={$signature}";

		$response = wp_remote_post( $endpoint, array(
			'timeout' => 30,
			'headers' => array(
				'Content-Type'  => 'application/json',
				'X-Amz-Date'    => $amz_date,
				'Authorization' => $authorization,
			),
			'body'    => $payload,
		) );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body        = wp_remote_retrieve_body( $response );

		if ( 200 !== $status_code ) {
			$json = json_decode( $body, true );
			/* translators: %d: HTTP status code. */
			$msg = ! empty( $json['message'] ) ? sanitize_text_field( $json['message'] ) : sprintf( __( 'Amazon Polly API returned error code %d.', 'text-to-speech-player' ), $status_code );
			return new \WP_Error( 'polly_api_error', $msg, array( 'status' => $status_code ) );
		}

		$latency   = round( ( microtime( true ) - $start_time ) * 1000 );
		$audio_uri = 'data:audio/mp3;base64,' . base64_encode( $body );

		return rest_ensure_response( array(
			'success'   => true,
			'provider'  => 'polly',
			'audio_url' => $audio_uri,
			'voice'     => $voice_id,
			'engine'    => $engine,
			'latency'   => $latency,
			/* translators: %d: Latency duration in milliseconds. */
			'message'   => sprintf( __( 'Amazon Polly synthesis succeeded in %d ms.', 'text-to-speech-player' ), $latency ),
		) );
	}

	/**
	 * Custom AI Provider (OpenAI-compatible / REST Webhook / Self-Hosted).
	 */
	protected function synthesize_custom( $text, $params, $settings, $start_time ) {
		$endpoint = ! empty( $params['endpoint'] ) ? esc_url_raw( $params['endpoint'] ) : ( ! empty( $settings['custom_ai_endpoint'] ) ? esc_url_raw( $settings['custom_ai_endpoint'] ) : '' );
		$api_key  = ! empty( $params['api_key'] ) ? sanitize_text_field( $params['api_key'] ) : ( ! empty( $settings['custom_ai_api_key'] ) ? $settings['custom_ai_api_key'] : '' );
		$model    = ! empty( $params['model'] ) ? sanitize_text_field( $params['model'] ) : ( ! empty( $settings['custom_ai_model'] ) ? $settings['custom_ai_model'] : 'tts-1' );
		$voice    = ! empty( $params['voice'] ) ? sanitize_text_field( $params['voice'] ) : ( ! empty( $settings['custom_ai_voice'] ) ? $settings['custom_ai_voice'] : 'default' );

		if ( empty( $endpoint ) || ! wp_http_validate_url( $endpoint ) ) {
			return new \WP_Error(
				'missing_endpoint',
				__( 'Please specify a valid Custom AI Endpoint URL.', 'text-to-speech-player' ),
				array( 'status' => 400 )
			);
		}

		$headers = array(
			'Content-Type' => 'application/json',
		);
		if ( ! empty( $api_key ) ) {
			$headers['Authorization'] = 'Bearer ' . $api_key;
		}

		$response = wp_safe_remote_post( $endpoint, array(
			'timeout' => 30,
			'headers' => $headers,
			'body'    => wp_json_encode( array(
				'model' => $model,
				'input' => $text,
				'voice' => $voice,
			) ),
		) );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status_code  = wp_remote_retrieve_response_code( $response );
		$content_type = wp_remote_retrieve_header( $response, 'content-type' );
		$body         = wp_remote_retrieve_body( $response );

		if ( 200 !== $status_code ) {
			return new \WP_Error(
				'custom_ai_error',
				/* translators: 1: HTTP status code, 2: Response body excerpt. */
				sprintf( __( 'Custom endpoint returned HTTP code %1$d: %2$s', 'text-to-speech-player' ), $status_code, wp_strip_all_tags( substr( $body, 0, 150 ) ) ),
				array( 'status' => $status_code )
			);
		}

		$latency = round( ( microtime( true ) - $start_time ) * 1000 );

		// Check if binary audio or JSON
		if ( strpos( $content_type, 'audio/' ) !== false || ( substr( $body, 0, 3 ) === 'ID3' || substr( $body, 0, 2 ) === "\xFF\xFB" ) ) {
			$audio_uri = 'data:audio/mp3;base64,' . base64_encode( $body );
		} else {
			$json = json_decode( $body, true );
			if ( ! empty( $json['audioContent'] ) ) {
				$audio_uri = 'data:audio/mp3;base64,' . $json['audioContent'];
			} elseif ( ! empty( $json['audio_url'] ) ) {
				$audio_uri = $json['audio_url'];
			} else {
				$audio_uri = null;
			}
		}

		return rest_ensure_response( array(
			'success'   => true,
			'provider'  => 'custom',
			'audio_url' => $audio_uri,
			'latency'   => $latency,
			/* translators: %d: Latency duration in milliseconds. */
			'message'   => sprintf( __( 'Custom AI synthesis succeeded in %d ms.', 'text-to-speech-player' ), $latency ),
		) );
	}
}
