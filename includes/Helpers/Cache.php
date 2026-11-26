<?php
namespace TextToSpeechPlayer\Helpers;

defined( 'ABSPATH' ) || exit;

/**
 * Cache and Transients Helper.
 */
class Cache {

	/**
	 * Flush all plugin transients.
	 */
	public static function flush_all() {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query(
			$wpdb->prepare(
				'DELETE FROM %i WHERE option_name LIKE %s OR option_name LIKE %s',
				$wpdb->options,
				$wpdb->esc_like( '_transient_tts_player_' ) . '%',
				$wpdb->esc_like( '_transient_timeout_tts_player_' ) . '%'
			)
		);
	}
}
