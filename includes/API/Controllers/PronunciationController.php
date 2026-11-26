<?php
namespace TextToSpeechPlayer\API\Controllers;

defined( 'ABSPATH' ) || exit;

/**
 * Pronunciation Aliases Controller.
 */
class PronunciationController {

	public function register_routes() {
		register_rest_route(
			'text-to-speech-player/v1',
			'/pronunciation',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_aliases' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'save_aliases' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => array(
						'aliases' => array(
							'type'        => 'array',
							'description' => 'List of phonetic pronunciation replacement rules.',
							'default'     => array(),
						),
					),
				),
			)
		);
	}

	public function permissions_check() {
		return current_user_can( 'manage_options' );
	}

	public function get_aliases( $request ) {
		$aliases = get_option( TTS_PLAYER_OPTION_ALIASES, array() );
		return rest_ensure_response( array(
			'success' => true,
			'aliases' => $aliases,
		) );
	}

	public function save_aliases( $request ) {
		$params  = $request->get_json_params();
		$aliases = ! empty( $params['aliases'] ) && is_array( $params['aliases'] ) ? $params['aliases'] : array();

		$sanitized = array();
		foreach ( $aliases as $alias ) {
			if ( ! empty( $alias['word'] ) && ! empty( $alias['spoken'] ) ) {
				$sanitized[] = array(
					'id'       => ! empty( $alias['id'] ) ? sanitize_key( $alias['id'] ) : wp_generate_uuid4(),
					'word'     => sanitize_text_field( $alias['word'] ),
					'spoken'   => sanitize_text_field( $alias['spoken'] ),
					'numbers'  => ! empty( $alias['numbers'] ),
				);
			}
		}

		update_option( TTS_PLAYER_OPTION_ALIASES, $sanitized );

		return rest_ensure_response( array(
			'success' => true,
			'message' => __( 'Pronunciation dictionary updated.', 'text-to-speech-player' ),
			'aliases' => $sanitized,
		) );
	}
}
