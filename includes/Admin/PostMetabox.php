<?php
namespace TextToSpeechPlayer\Admin;

defined( 'ABSPATH' ) || exit;

/**
 * Post Metabox & Posts List Column Handler.
 */
class PostMetabox {

	const NONCE_ACTION = 'tts_player_save_post_meta';
	const NONCE_FIELD  = 'tts_player_meta_nonce';

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'add_meta_boxes', array( $this, 'add_metabox' ) );
		add_action( 'save_post', array( $this, 'save_post' ), 10, 2 );

		// Posts List Column Hooks
		$settings   = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );
		$post_types = ! empty( $settings['enabled_post_types'] ) && is_array( $settings['enabled_post_types'] )
			? $settings['enabled_post_types']
			: array( 'post', 'page' );

		foreach ( $post_types as $pt ) {
			add_filter( "manage_{$pt}_posts_columns", array( $this, 'register_posts_column' ) );
			add_action( "manage_{$pt}_posts_custom_column", array( $this, 'render_posts_column' ), 10, 2 );
			add_filter( "bulk_actions-edit-{$pt}", array( $this, 'register_bulk_actions' ) );
			add_filter( "handle_bulk_actions-edit-{$pt}", array( $this, 'handle_bulk_actions' ), 10, 3 );
		}
	}

	/**
	 * Register metabox on configured post types.
	 */
	public function add_metabox() {
		$settings   = get_option( TTS_PLAYER_OPTION_SETTINGS, array() );
		$post_types = ! empty( $settings['enabled_post_types'] ) && is_array( $settings['enabled_post_types'] )
			? $settings['enabled_post_types']
			: array( 'post', 'page' );

		foreach ( $post_types as $pt ) {
			add_meta_box(
				'tts_player_meta',
				__( 'Text to Speech Player', 'text-to-speech-player' ),
				array( $this, 'render_metabox' ),
				$pt,
				'side',
				'default'
			);
		}
	}

	/**
	 * Render metabox contents.
	 *
	 * @param \WP_Post $post Current post.
	 */
	public function render_metabox( $post ) {
		wp_nonce_field( self::NONCE_ACTION, self::NONCE_FIELD );

		$disable_player = get_post_meta( $post->ID, '_tts_player_disable', true );
		$custom_voice   = get_post_meta( $post->ID, '_tts_player_custom_voice', true );
		$custom_mp3     = get_post_meta( $post->ID, '_tts_player_custom_mp3', true );
		$custom_intro   = get_post_meta( $post->ID, '_tts_player_custom_intro', true );
		$custom_outro   = get_post_meta( $post->ID, '_tts_player_custom_outro', true );
		$allow_download = get_post_meta( $post->ID, '_tts_player_allow_download', true );
		?>
		<div class="tts-player-metabox-wrap" style="padding: 4px 0;">
			<p>
				<label style="font-weight: 600; color: #1e293b; display: inline-flex; align-items: center; gap: 6px;">
					<input type="checkbox" name="tts_player_disable" value="1" <?php checked( $disable_player, '1' ); ?>>
					<?php esc_html_e( 'Disable player on this post', 'text-to-speech-player' ); ?>
				</label>
			</p>

			<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;">

			<!-- Custom Audio File (MP3) -->
			<p style="margin-top: 8px;">
				<label for="tts_player_custom_mp3" style="display:block; margin-bottom: 4px; font-weight: 600; color: #334155; font-size: 12px;">
					<?php esc_html_e( 'Custom Audio File (MP3):', 'text-to-speech-player' ); ?>
				</label>
				<input type="url" id="tts_player_custom_mp3" name="tts_player_custom_mp3" value="<?php echo esc_url( $custom_mp3 ); ?>" style="width: 100%; font-size: 12px; margin-bottom: 6px;" placeholder="https://example.com/audio.mp3">
				<button type="button" class="button button-secondary button-small" id="tts_upload_mp3_btn">
					<?php esc_html_e( 'Choose / Upload MP3', 'text-to-speech-player' ); ?>
				</button>
				<?php if ( ! empty( $custom_mp3 ) ) : ?>
					<button type="button" class="button button-link-delete button-small" id="tts_clear_mp3_btn" style="margin-left: 6px;">
						<?php esc_html_e( 'Remove', 'text-to-speech-player' ); ?>
					</button>
				<?php endif; ?>
				<span class="description" style="display:block; font-size: 11px; color: #64748b; margin-top: 4px;">
					<?php esc_html_e( 'If set, the player plays this studio MP3 instead of browser speech synthesis.', 'text-to-speech-player' ); ?>
				</span>
			</p>

			<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;">

			<!-- Custom Voice Override -->
			<p style="margin-top: 8px;">
				<label for="tts_player_custom_voice" style="display:block; margin-bottom: 4px; font-weight: 600; color: #334155; font-size: 12px;">
					<?php esc_html_e( 'Voice Override (Optional):', 'text-to-speech-player' ); ?>
				</label>
				<input type="text" id="tts_player_custom_voice" name="tts_player_custom_voice" value="<?php echo esc_attr( $custom_voice ); ?>" style="width: 100%; font-size: 12px;" placeholder="e.g. Google US English">
			</p>

			<!-- Custom Intro Text -->
			<p style="margin-top: 10px;">
				<label for="tts_player_custom_intro" style="display:block; margin-bottom: 4px; font-weight: 600; color: #334155; font-size: 12px;">
					<?php esc_html_e( 'Custom Spoken Intro:', 'text-to-speech-player' ); ?>
				</label>
				<input type="text" id="tts_player_custom_intro" name="tts_player_custom_intro" value="<?php echo esc_attr( $custom_intro ); ?>" style="width: 100%; font-size: 12px;" placeholder="<?php esc_attr_e( 'Spoken before article content', 'text-to-speech-player' ); ?>">
			</p>

			<!-- Custom Outro Text -->
			<p style="margin-top: 10px;">
				<label for="tts_player_custom_outro" style="display:block; margin-bottom: 4px; font-weight: 600; color: #334155; font-size: 12px;">
					<?php esc_html_e( 'Custom Spoken Outro:', 'text-to-speech-player' ); ?>
				</label>
				<input type="text" id="tts_player_custom_outro" name="tts_player_custom_outro" value="<?php echo esc_attr( $custom_outro ); ?>" style="width: 100%; font-size: 12px;" placeholder="<?php esc_attr_e( 'Spoken after article content', 'text-to-speech-player' ); ?>">
			</p>

			<!-- Allow Download -->
			<p style="margin-top: 12px;">
				<label style="font-size: 12px; color: #334155;">
					<input type="checkbox" name="tts_player_allow_download" value="1" <?php checked( $allow_download, '1' ); ?>>
					<?php esc_html_e( 'Allow visitors to download MP3', 'text-to-speech-player' ); ?>
				</label>
			</p>
		</div>
		<?php
	}

	/**
	 * Save metabox data.
	 *
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post    Post object.
	 */
	public function save_post( $post_id, $post ) {
		if ( ! isset( $_POST[ self::NONCE_FIELD ] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ self::NONCE_FIELD ] ) ), self::NONCE_ACTION ) ) {
			return;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		// Disable player toggle
		if ( isset( $_POST['tts_player_disable'] ) ) {
			update_post_meta( $post_id, '_tts_player_disable', '1' );
		} else {
			delete_post_meta( $post_id, '_tts_player_disable' );
		}

		// Custom MP3
		if ( isset( $_POST['tts_player_custom_mp3'] ) ) {
			$mp3 = esc_url_raw( wp_unslash( $_POST['tts_player_custom_mp3'] ) );
			if ( ! empty( $mp3 ) ) {
				update_post_meta( $post_id, '_tts_player_custom_mp3', $mp3 );
			} else {
				delete_post_meta( $post_id, '_tts_player_custom_mp3' );
			}
		}

		// Custom voice override
		if ( isset( $_POST['tts_player_custom_voice'] ) ) {
			$voice = sanitize_text_field( wp_unslash( $_POST['tts_player_custom_voice'] ) );
			if ( ! empty( $voice ) ) {
				update_post_meta( $post_id, '_tts_player_custom_voice', $voice );
			} else {
				delete_post_meta( $post_id, '_tts_player_custom_voice' );
			}
		}

		// Custom intro
		if ( isset( $_POST['tts_player_custom_intro'] ) ) {
			$intro = sanitize_text_field( wp_unslash( $_POST['tts_player_custom_intro'] ) );
			if ( ! empty( $intro ) ) {
				update_post_meta( $post_id, '_tts_player_custom_intro', $intro );
			} else {
				delete_post_meta( $post_id, '_tts_player_custom_intro' );
			}
		}

		// Custom outro
		if ( isset( $_POST['tts_player_custom_outro'] ) ) {
			$outro = sanitize_text_field( wp_unslash( $_POST['tts_player_custom_outro'] ) );
			if ( ! empty( $outro ) ) {
				update_post_meta( $post_id, '_tts_player_custom_outro', $outro );
			} else {
				delete_post_meta( $post_id, '_tts_player_custom_outro' );
			}
		}

		// Allow download
		if ( isset( $_POST['tts_player_allow_download'] ) ) {
			update_post_meta( $post_id, '_tts_player_allow_download', '1' );
		} else {
			delete_post_meta( $post_id, '_tts_player_allow_download' );
		}
	}

	/**
	 * Register Posts List Column.
	 *
	 * @param array $columns Existing columns.
	 * @return array
	 */
	public function register_posts_column( $columns ) {
		$columns['tts_audio_status'] = __( 'Audio Status', 'text-to-speech-player' );
		return $columns;
	}

	/**
	 * Render Posts List Column Content.
	 *
	 * @param string $column_name Column name.
	 * @param int    $post_id     Post ID.
	 */
	public function render_posts_column( $column_name, $post_id ) {
		if ( 'tts_audio_status' !== $column_name ) {
			return;
		}

		$is_disabled = get_post_meta( $post_id, '_tts_player_disable', true );
		$custom_mp3  = get_post_meta( $post_id, '_tts_player_custom_mp3', true );

		if ( $is_disabled ) {
			echo '<span style="display:inline-block; background:#f1f5f9; color:#64748b; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;">⚪ ' . esc_html__( 'Disabled', 'text-to-speech-player' ) . '</span>';
		} elseif ( ! empty( $custom_mp3 ) ) {
			echo '<span style="display:inline-block; background:#f3e8ff; color:#7e22ce; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;" title="' . esc_attr( $custom_mp3 ) . '">🟣 ' . esc_html__( 'Custom MP3', 'text-to-speech-player' ) . '</span>';
		} else {
			echo '<span style="display:inline-block; background:#ecfdf5; color:#047857; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;">🟢 ' . esc_html__( 'Active (TTS)', 'text-to-speech-player' ) . '</span>';
		}
	}

	/**
	 * Register bulk actions in post lists.
	 *
	 * @param array $bulk_actions Existing bulk actions.
	 * @return array
	 */
	public function register_bulk_actions( $bulk_actions ) {
		$bulk_actions['tts_player_bulk_enable']  = __( 'Audio: Enable Player', 'text-to-speech-player' );
		$bulk_actions['tts_player_bulk_disable'] = __( 'Audio: Disable Player', 'text-to-speech-player' );
		return $bulk_actions;
	}

	/**
	 * Handle post list bulk actions.
	 *
	 * @param string $redirect_to Redirect URL.
	 * @param string $doaction    Action name.
	 * @param array  $post_ids    Array of post IDs.
	 * @return string
	 */
	public function handle_bulk_actions( $redirect_to, $doaction, $post_ids ) {
		if ( ! in_array( $doaction, array( 'tts_player_bulk_enable', 'tts_player_bulk_disable' ), true ) || empty( $post_ids ) ) {
			return $redirect_to;
		}

		foreach ( $post_ids as $post_id ) {
			$post_id = absint( $post_id );
			if ( ! current_user_can( 'edit_post', $post_id ) ) {
				continue;
			}
			if ( 'tts_player_bulk_enable' === $doaction ) {
				delete_post_meta( $post_id, '_tts_player_disable' );
			} elseif ( 'tts_player_bulk_disable' === $doaction ) {
				update_post_meta( $post_id, '_tts_player_disable', '1' );
			}
		}

		return add_query_arg( 'tts_player_bulk_processed', count( $post_ids ), $redirect_to );
	}
}
