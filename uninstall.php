<?php
/**
 * Uninstall Handler for Text to Speech Player.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

/**
 * Clean up plugin data for the current site.
 */
function tts_player_uninstall_cleanup() {
	global $wpdb;

	// Clean up transients.
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
	$wpdb->query(
		$wpdb->prepare(
			'DELETE FROM %i WHERE option_name LIKE %s OR option_name LIKE %s',
			$wpdb->options,
			$wpdb->esc_like( '_transient_tts_player_' ) . '%',
			$wpdb->esc_like( '_transient_timeout_tts_player_' ) . '%'
		)
	);

	// Delete options and post meta if the user enabled "Delete Data on Uninstall".
	$settings = get_option( 'tts_player_settings', array() );
	if ( ! empty( $settings['delete_data_on_uninstall'] ) ) {
		delete_option( 'tts_player_settings' );
		delete_option( 'tts_player_aliases' );
		delete_option( 'tts_player_cache_version' );

		$meta_keys = array(
			'_tts_player_disable',
			'_tts_player_custom_voice',
			'_tts_player_custom_mp3',
			'_tts_player_custom_intro',
			'_tts_player_custom_outro',
			'_tts_player_allow_download',
			'_tts_player_play_count',
		);
		foreach ( $meta_keys as $meta_key ) {
			delete_post_meta_by_key( $meta_key );
		}
	}
}

if ( is_multisite() ) {
	$tts_player_site_ids = get_sites( array( 'fields' => 'ids' ) );
	foreach ( $tts_player_site_ids as $tts_player_site_id ) {
		switch_to_blog( $tts_player_site_id );
		tts_player_uninstall_cleanup();
		restore_current_blog();
	}
} else {
	tts_player_uninstall_cleanup();
}
