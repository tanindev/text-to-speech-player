import React, { useState, useEffect, useRef } from 'react';
import { render } from '@wordpress/element';
import {
	Button,
	ToggleControl,
	SelectControl,
	TextControl,
	TextareaControl,
	Spinner,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

import './scss/admin.scss';
import './scss/player.scss';

const VALID_TABS = [
	'general',
	'appearance',
	'voice',
	'pronunciation',
	'ai',
	'analytics',
	'status',
	'tools',
];

const AdminApp = () => {
	const initialData = window.ttsPlayerData || {};
	const [ activeTab, setActiveTab ] = useState( 'general' );
	const [ settings, setSettings ] = useState( initialData.settings || {} );
	const [ aliases, setAliases ] = useState( initialData.aliases || [] );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ toast, setToast ] = useState( null );

	// Voice selection state
	const [ availableVoices, setAvailableVoices ] = useState( [] );
	const [ testSpeechText, setTestSpeechText ] = useState(
		'Welcome to our website. Enjoy listening to this article!'
	);
	const [ isTestingSpeech, setIsTestingSpeech ] = useState( false );

	// New Alias Form state
	const [ newWord, setNewWord ] = useState( '' );
	const [ newSpoken, setNewSpoken ] = useState( '' );
	const [ newNumbers, setNewNumbers ] = useState( false );
	const [ isSavingAlias, setIsSavingAlias ] = useState( false );

	// Analytics state
	const [ analyticsData, setAnalyticsData ] = useState( null );
	const [ loadingAnalytics, setLoadingAnalytics ] = useState( false );

	// Live Preview Player state
	const [ previewPlaying, setPreviewPlaying ] = useState( false );
	const [ previewHighlightIdx, setPreviewHighlightIdx ] = useState( -1 );

	const previewSentence =
		'Welcome to WordPress. Enjoy listening to this article using Text to Speech Player.';
	const previewWords = previewSentence.split( ' ' );

	// AI Provider state
	const [ selectedAiTab, setSelectedAiTab ] = useState(
		initialData.settings?.active_ai_provider || 'openai'
	);
	const [ isSynthesizing, setIsSynthesizing ] = useState( false );
	const [ synthesizedAudio, setSynthesizedAudio ] = useState( null );
	const [ synthLatency, setSynthLatency ] = useState( null );
	const [ synthError, setSynthError ] = useState( null );

	// 1. URL Tab Synchronization
	useEffect( () => {
		const params = new URLSearchParams( window.location.search );
		const tab = params.get( 'tab' );
		if ( tab && VALID_TABS.includes( tab ) ) {
			setActiveTab( tab );
		}
	}, [] );

	// 2. Discover Browser Web Speech Voices
	useEffect( () => {
		if ( typeof window !== 'undefined' && 'speechSynthesis' in window ) {
			const updateVoices = () => {
				const voices = window.speechSynthesis.getVoices();
				if ( voices && voices.length > 0 ) {
					setAvailableVoices( voices );
				}
			};
			updateVoices();
			window.speechSynthesis.onvoiceschanged = updateVoices;
		}
	}, [] );

	// 3. Load Analytics on Tab Change
	useEffect( () => {
		if ( activeTab === 'analytics' && ! analyticsData ) {
			loadAnalytics();
		}
	}, [ activeTab ] );

	const loadAnalytics = async () => {
		setLoadingAnalytics( true );
		try {
			const res = await apiFetch( {
				path: 'text-to-speech-player/v1/analytics/summary',
			} );
			if ( res && res.success ) {
				setAnalyticsData( res );
			}
		} catch ( err ) {
			// Suppress error
		} finally {
			setLoadingAnalytics( false );
		}
	};

	const handleTabChange = ( tab ) => {
		setActiveTab( tab );
		const url = new URL( window.location );
		url.searchParams.set( 'tab', tab );
		window.history.pushState( {}, '', url );
	};

	const updateSetting = ( key, value ) => {
		setSettings( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	const showToast = ( type, message ) => {
		setToast( { type, message } );
		setTimeout( () => setToast( null ), 4000 );
	};

	const formatSelectFloat = ( val, fallback = '1' ) => {
		if ( val === undefined || val === null || val === '' ) {
			return fallback;
		}
		const num = parseFloat( val );
		return isNaN( num ) ? fallback : String( num );
	};

	// Save Settings
	const saveSettings = async () => {
		setIsSaving( true );
		try {
			const res = await apiFetch( {
				path: 'text-to-speech-player/v1/settings',
				method: 'POST',
				data: settings,
			} );
			if ( res && res.success ) {
				if ( res.settings ) {
					setSettings( res.settings );
					if ( window.ttsPlayerData ) {
						window.ttsPlayerData.settings = res.settings;
					}
				}
				showToast(
					'success',
					__(
						'Settings saved successfully!',
						'text-to-speech-player'
					)
				);
			}
		} catch ( err ) {
			showToast(
				'error',
				__(
					'Failed to save settings. Please try again.',
					'text-to-speech-player'
				)
			);
		} finally {
			setIsSaving( false );
		}
	};

	// Save Aliases to REST API
	const handleSaveAliases = async ( updatedAliases ) => {
		setIsSavingAlias( true );
		try {
			const res = await apiFetch( {
				path: 'text-to-speech-player/v1/pronunciation',
				method: 'POST',
				data: { aliases: updatedAliases },
			} );
			if ( res && res.success ) {
				setAliases( res.aliases );
				showToast(
					'success',
					__(
						'Pronunciation dictionary updated!',
						'text-to-speech-player'
					)
				);
			}
		} catch ( err ) {
			showToast(
				'error',
				__(
					'Failed to update pronunciation dictionary.',
					'text-to-speech-player'
				)
			);
		} finally {
			setIsSavingAlias( false );
		}
	};

	const handleAddAlias = ( e ) => {
		e.preventDefault();
		if ( ! newWord.trim() || ! newSpoken.trim() ) {
			return;
		}

		const newEntry = {
			id: 'alias_' + Date.now(),
			word: newWord.trim(),
			spoken: newSpoken.trim(),
			numbers: newNumbers,
		};

		const updated = [ ...aliases, newEntry ];
		setAliases( updated );
		setNewWord( '' );
		setNewSpoken( '' );
		setNewNumbers( false );
		handleSaveAliases( updated );
	};

	const handleDeleteAlias = ( id ) => {
		const updated = aliases.filter( ( a ) => a.id !== id );
		setAliases( updated );
		handleSaveAliases( updated );
	};

	// Tools: Export settings as JSON
	const handleExportSettings = () => {
		const dataStr =
			'data:text/json;charset=utf-8,' +
			encodeURIComponent( JSON.stringify( settings, null, 2 ) );
		const downloadAnchor = document.createElement( 'a' );
		downloadAnchor.setAttribute( 'href', dataStr );
		downloadAnchor.setAttribute(
			'download',
			'text-to-speech-player-settings.json'
		);
		document.body.appendChild( downloadAnchor );
		downloadAnchor.click();
		downloadAnchor.remove();
		showToast(
			'success',
			__( 'Settings exported successfully!', 'text-to-speech-player' )
		);
	};

	// Tools: Import settings from JSON
	const handleImportSettings = async ( e ) => {
		const file = e.target.files && e.target.files[ 0 ];
		if ( ! file ) return;
		const reader = new FileReader();
		reader.onload = async ( event ) => {
			try {
				const parsed = JSON.parse( event.target.result );
				const res = await apiFetch( {
					path: 'text-to-speech-player/v1/settings/import',
					method: 'POST',
					data: { settings: parsed },
				} );
				if ( res && res.success && res.settings ) {
					setSettings( res.settings );
					if ( window.ttsPlayerData ) {
						window.ttsPlayerData.settings = res.settings;
					}
					showToast(
						'success',
						__(
							'Settings imported successfully!',
							'text-to-speech-player'
						)
					);
				}
			} catch ( err ) {
				showToast(
					'error',
					__(
						'Failed to import settings. Invalid JSON file.',
						'text-to-speech-player'
					)
				);
			}
		};
		reader.readAsText( file );
	};

	// Tools: Factory Reset Settings
	const handleResetSettings = async () => {
		if (
			! window.confirm(
				__(
					'Are you sure you want to reset all plugin settings to factory defaults? This action cannot be undone.',
					'text-to-speech-player'
				)
			)
		) {
			return;
		}
		try {
			const res = await apiFetch( {
				path: 'text-to-speech-player/v1/settings/reset',
				method: 'POST',
			} );
			if ( res && res.success && res.settings ) {
				setSettings( res.settings );
				if ( window.ttsPlayerData ) {
					window.ttsPlayerData.settings = res.settings;
				}
				showToast(
					'success',
					__(
						'All settings reset to factory defaults!',
						'text-to-speech-player'
					)
				);
			}
		} catch ( err ) {
			showToast(
				'error',
				__( 'Failed to reset settings.', 'text-to-speech-player' )
			);
		}
	};

	// Test Speech in Browser
	const speakPhrase = ( text, voiceName = null ) => {
		if (
			typeof window === 'undefined' ||
			! ( 'speechSynthesis' in window )
		) {
			return;
		}
		window.speechSynthesis.cancel();
		const utter = new SpeechSynthesisUtterance( text );
		utter.rate =
			typeof settings.default_rate === 'number'
				? settings.default_rate
				: parseFloat( settings.default_rate || 1.0 );
		utter.pitch =
			typeof settings.default_pitch === 'number'
				? settings.default_pitch
				: parseFloat( settings.default_pitch || 1.0 );

		const targetVoice = (
			voiceName ||
			settings.default_voice ||
			''
		).trim();
		if ( targetVoice && availableVoices.length > 0 ) {
			const found =
				availableVoices.find( ( v ) => v.name === targetVoice ) ||
				availableVoices.find(
					( v ) => v.name.toLowerCase() === targetVoice.toLowerCase()
				) ||
				availableVoices.find( ( v ) =>
					v.name.toLowerCase().includes( targetVoice.toLowerCase() )
				);
			if ( found ) utter.voice = found;
		}

		window.speechSynthesis.speak( utter );
	};

	// Handle Interactive Preview Play
	const togglePreviewPlay = () => {
		if ( previewPlaying ) {
			window.speechSynthesis.cancel();
			setPreviewPlaying( false );
			setPreviewHighlightIdx( -1 );
		} else {
			setPreviewPlaying( true );
			setPreviewHighlightIdx( 0 );

			let currentIdx = 0;
			const stepMs = Math.max(
				240,
				Math.round( 4500 / previewWords.length )
			);
			const timer = setInterval( () => {
				currentIdx++;
				if ( currentIdx < previewWords.length ) {
					setPreviewHighlightIdx( currentIdx );
				} else {
					clearInterval( timer );
					setPreviewHighlightIdx( -1 );
				}
			}, stepMs );

			speakPhrase( previewSentence );
			setTimeout( () => {
				clearInterval( timer );
				setPreviewPlaying( false );
				setPreviewHighlightIdx( -1 );
			}, 4800 );
		}
	};

	// Handle Real AI Audio Synthesis
	const handleSynthesizeAudio = async ( provider = selectedAiTab ) => {
		if ( ! testSpeechText.trim() ) {
			return;
		}

		setIsSynthesizing( true );
		setSynthError( null );
		setSynthesizedAudio( null );
		setSynthLatency( null );

		try {
			const res = await apiFetch( {
				path: 'text-to-speech-player/v1/speech/synthesize',
				method: 'POST',
				data: {
					provider: provider,
					text: testSpeechText,
				},
			} );

			if ( res && res.success && res.audio_url ) {
				setSynthesizedAudio( res.audio_url );
				setSynthLatency( res.latency || null );
			} else {
				throw new Error(
					res?.message ||
						__(
							'Synthesis succeeded, but no audio was returned.',
							'text-to-speech-player'
						)
				);
			}
		} catch ( err ) {
			const errorMsg =
				err.message ||
				( typeof err === 'string'
					? err
					: __(
							'Failed to synthesize speech via AI provider.',
							'text-to-speech-player'
					  ) );
			setSynthError( errorMsg );
		} finally {
			setIsSynthesizing( false );
		}
	};

	const availablePostTypes = initialData.availablePostTypes || [
		{ value: 'post', label: 'Posts' },
		{ value: 'page', label: 'Pages' },
	];

	return (
		<div className="tts-admin-wrapper">
			{ /* Header */ }
			<header className="tts-admin-header">
				<div className="tts-header-left">
					<div className="tts-logo-badge">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
						</svg>
					</div>
					<div className="tts-header-titles">
						<h1>
							{ __(
								'Text to Speech Player',
								'text-to-speech-player'
							) }
						</h1>
						<p>
							{ __(
								'AI Audio Reader & Accessibility Settings',
								'text-to-speech-player'
							) }
						</p>
					</div>
				</div>
				<div className="tts-header-actions">
					<Button
						variant="primary"
						isBusy={ isSaving }
						disabled={ isSaving }
						onClick={ saveSettings }
					>
						{ isSaving
							? __( 'Saving...', 'text-to-speech-player' )
							: __( 'Save Changes', 'text-to-speech-player' ) }
					</Button>
				</div>
			</header>

			{ /* Main Body */ }
			<div className="tts-app-container">
				{ toast && (
					<div
						style={ {
							padding: '12px 18px',
							borderRadius: '8px',
							marginBottom: '20px',
							backgroundColor:
								toast.type === 'success'
									? '#def7ec'
									: '#fde8e8',
							color:
								toast.type === 'success'
									? '#03543f'
									: '#9b1c1c',
							fontWeight: '600',
						} }
					>
						{ toast.message }
					</div>
				) }

				{ /* Tab Navigation */ }
				<nav className="tts-tabs-nav">
					{ [
						{
							id: 'general',
							label: __( 'General', 'text-to-speech-player' ),
						},
						{
							id: 'appearance',
							label: __( 'Appearance', 'text-to-speech-player' ),
						},
						{
							id: 'voice',
							label: __(
								'Voice & Speech',
								'text-to-speech-player'
							),
						},
						{
							id: 'pronunciation',
							label: __(
								'Pronunciation (Aliases)',
								'text-to-speech-player'
							),
						},
						{
							id: 'ai',
							label: __(
								'AI Providers (BYOK)',
								'text-to-speech-player'
							),
						},
						{
							id: 'analytics',
							label: __( 'Analytics', 'text-to-speech-player' ),
						},
						{
							id: 'status',
							label: __(
								'System Status',
								'text-to-speech-player'
							),
						},
						{
							id: 'tools',
							label: __(
								'Tools & Backup',
								'text-to-speech-player'
							),
						},
					].map( ( tab ) => (
						<button
							key={ tab.id }
							className={ `tts-tab-item ${
								activeTab === tab.id ? 'active' : ''
							}` }
							onClick={ () => handleTabChange( tab.id ) }
						>
							{ tab.label }
						</button>
					) ) }
				</nav>

				{ /* 1. TAB: GENERAL */ }
				{ activeTab === 'general' && (
					<>
						<div className="tts-card">
							<h2 className="tts-card-title">
								{ __(
									'Display & Placement',
									'text-to-speech-player'
								) }
							</h2>
							<p className="tts-card-desc">
								{ __(
									'Choose where the audio player should automatically appear on your website.',
									'text-to-speech-player'
								) }
							</p>

							{ /* Post Types Checkboxes */ }
							<div className="tts-form-row">
								<label>
									{ __(
										'Enable on Post Types',
										'text-to-speech-player'
									) }
								</label>
								<div
									style={ {
										display: 'flex',
										gap: '16px',
										flexWrap: 'wrap',
										marginTop: '4px',
									} }
								>
									{ availablePostTypes.map( ( pt ) => {
										const enabledList =
											settings.enabled_post_types || [
												'post',
												'page',
											];
										const isChecked = enabledList.includes(
											pt.value
										);
										return (
											<label
												key={ pt.value }
												style={ {
													display: 'inline-flex',
													alignItems: 'center',
													gap: '6px',
													cursor: 'pointer',
													fontWeight: 500,
												} }
											>
												<input
													type="checkbox"
													checked={ isChecked }
													onChange={ () => {
														const next = isChecked
															? enabledList.filter(
																	( item ) =>
																		item !==
																		pt.value
															  )
															: [
																	...enabledList,
																	pt.value,
															  ];
														updateSetting(
															'enabled_post_types',
															next
														);
													} }
												/>
												{ pt.label }
											</label>
										);
									} ) }
								</div>
							</div>

							<div
								className="tts-form-row"
								style={ { marginTop: '16px' } }
							>
								<SelectControl
									label={ __(
										'Player Position',
										'text-to-speech-player'
									) }
									value={
										settings.player_position ||
										'before_content'
									}
									options={ [
										{
											label: __(
												'Before Post Content (Recommended)',
												'text-to-speech-player'
											),
											value: 'before_content',
										},
										{
											label: __(
												'After Post Content',
												'text-to-speech-player'
											),
											value: 'after_content',
										},
										{
											label: __(
												'Sticky (Fixed on Screen)',
												'text-to-speech-player'
											),
											value: 'sticky',
										},
										{
											label: __(
												'Manual (Shortcode / Block Only)',
												'text-to-speech-player'
											),
											value: 'manual',
										},
									] }
									onChange={ ( val ) =>
										updateSetting( 'player_position', val )
									}
								/>
							</div>

							{ settings.player_position === 'sticky' && (
								<div
									className="tts-sticky-options"
									style={ {
										marginTop: '16px',
										padding: '16px',
										background: '#f8fafc',
										borderRadius: '8px',
										border: '1px solid #e2e8f0',
									} }
								>
									<h4
										style={ {
											margin: '0 0 12px 0',
											fontSize: '13px',
											fontWeight: 700,
											color: '#1e293b',
											display: 'flex',
											alignItems: 'center',
											gap: '6px',
										} }
									>
										<span style={ { fontSize: '15px' } }>
											📌
										</span>
										{ __(
											'Sticky Screen Position & Coordinates',
											'text-to-speech-player'
										) }
									</h4>

									<SelectControl
										label={ __(
											'Sticky Position',
											'text-to-speech-player'
										) }
										value={
											settings.sticky_position ||
											'bottom_right'
										}
										options={ [
											{
												label: __(
													'Bottom Right (Default)',
													'text-to-speech-player'
												),
												value: 'bottom_right',
											},
											{
												label: __(
													'Bottom Left',
													'text-to-speech-player'
												),
												value: 'bottom_left',
											},
											{
												label: __(
													'Bottom Center',
													'text-to-speech-player'
												),
												value: 'bottom_center',
											},
											{
												label: __(
													'Top Right',
													'text-to-speech-player'
												),
												value: 'top_right',
											},
											{
												label: __(
													'Top Left',
													'text-to-speech-player'
												),
												value: 'top_left',
											},
											{
												label: __(
													'Top Center',
													'text-to-speech-player'
												),
												value: 'top_center',
											},
											{
												label: __(
													'Middle Left',
													'text-to-speech-player'
												),
												value: 'left_center',
											},
											{
												label: __(
													'Middle Right',
													'text-to-speech-player'
												),
												value: 'right_center',
											},
										] }
										onChange={ ( val ) =>
											updateSetting(
												'sticky_position',
												val
											)
										}
										help={ __(
											'Select which screen edge or corner the floating audio player attaches to.',
											'text-to-speech-player'
										) }
									/>

									<div
										style={ {
											display: 'grid',
											gridTemplateColumns: '1fr 1fr',
											gap: '16px',
											marginTop: '12px',
										} }
									>
										<div>
											<label
												style={ {
													fontSize: '12px',
													fontWeight: 600,
													display: 'block',
													marginBottom: '6px',
													color: '#334155',
												} }
											>
												{ __(
													'Adjust X Position (Horizontal Offset)',
													'text-to-speech-player'
												) }
											</label>
											<div
												style={ {
													display: 'flex',
													alignItems: 'center',
													gap: '6px',
												} }
											>
												<input
													type="number"
													className="components-text-control__input"
													min="0"
													max="500"
													step="1"
													value={
														settings.sticky_offset_x !==
														undefined
															? settings.sticky_offset_x
															: 24
													}
													onChange={ ( e ) => {
														const val = parseInt(
															e.target.value,
															10
														);
														updateSetting(
															'sticky_offset_x',
															isNaN( val )
																? 0
																: val
														);
													} }
													style={ {
														width: '100%',
														height: '36px',
													} }
												/>
												<span
													style={ {
														fontSize: '13px',
														fontWeight: 600,
														color: '#64748b',
													} }
												>
													px
												</span>
											</div>
											<p
												style={ {
													fontSize: '11px',
													color: '#64748b',
													margin: '4px 0 0',
												} }
											>
												{ __(
													'Distance from left/right screen edge.',
													'text-to-speech-player'
												) }
											</p>
										</div>

										<div>
											<label
												style={ {
													fontSize: '12px',
													fontWeight: 600,
													display: 'block',
													marginBottom: '6px',
													color: '#334155',
												} }
											>
												{ __(
													'Adjust Y Position (Vertical Offset)',
													'text-to-speech-player'
												) }
											</label>
											<div
												style={ {
													display: 'flex',
													alignItems: 'center',
													gap: '6px',
												} }
											>
												<input
													type="number"
													className="components-text-control__input"
													min="0"
													max="500"
													step="1"
													value={
														settings.sticky_offset_y !==
														undefined
															? settings.sticky_offset_y
															: 24
													}
													onChange={ ( e ) => {
														const val = parseInt(
															e.target.value,
															10
														);
														updateSetting(
															'sticky_offset_y',
															isNaN( val )
																? 0
																: val
														);
													} }
													style={ {
														width: '100%',
														height: '36px',
													} }
												/>
												<span
													style={ {
														fontSize: '13px',
														fontWeight: 600,
														color: '#64748b',
													} }
												>
													px
												</span>
											</div>
											<p
												style={ {
													fontSize: '11px',
													color: '#64748b',
													margin: '4px 0 0',
												} }
											>
												{ __(
													'Distance from top/bottom screen edge.',
													'text-to-speech-player'
												) }
											</p>
										</div>
									</div>
								</div>
							) }

							{ settings.player_position !== 'sticky' && (
								<div
									style={ {
										marginTop: '20px',
										borderTop: '1px solid #f1f5f9',
										paddingTop: '20px',
									} }
								>
									<ToggleControl
										label={ __(
											'Enable Sticky Floating Dock',
											'text-to-speech-player'
										) }
										help={ __(
											'The audio player smoothly docks to the bottom edge when readers scroll past it.',
											'text-to-speech-player'
										) }
										checked={
											!! settings.enable_floating_dock
										}
										onChange={ ( val ) =>
											updateSetting(
												'enable_floating_dock',
												val
											)
										}
									/>

									{ settings.enable_floating_dock && (
										<div
											className="tts-form-row"
											style={ {
												marginTop: '12px',
												paddingLeft: '12px',
											} }
										>
											<SelectControl
												label={ __(
													'Floating Dock Position',
													'text-to-speech-player'
												) }
												value={
													settings.floating_dock_position ||
													'bottom_right'
												}
												options={ [
													{
														label: __(
															'Bottom Right (Default)',
															'text-to-speech-player'
														),
														value: 'bottom_right',
													},
													{
														label: __(
															'Bottom Left',
															'text-to-speech-player'
														),
														value: 'bottom_left',
													},
													{
														label: __(
															'Sticky Top Bar',
															'text-to-speech-player'
														),
														value: 'top_dock',
													},
												] }
												onChange={ ( val ) =>
													updateSetting(
														'floating_dock_position',
														val
													)
												}
											/>
										</div>
									) }
								</div>
							) }

							<div
								style={ {
									marginTop: '20px',
									borderTop: '1px solid #f1f5f9',
									paddingTop: '20px',
								} }
							>
								<ToggleControl
									label={ __(
										'Enable Audio Schema (JSON-LD)',
										'text-to-speech-player'
									) }
									help={ __(
										'Generates AudioObject structured data for rich search results in Google.',
										'text-to-speech-player'
									) }
									checked={ !! settings.enable_audio_schema }
									onChange={ ( val ) =>
										updateSetting(
											'enable_audio_schema',
											val
										)
									}
								/>
							</div>

							<div
								style={ {
									marginTop: '20px',
									borderTop: '1px solid #f1f5f9',
									paddingTop: '20px',
								} }
							>
								<ToggleControl
									label={ __(
										'Disable Player on Front Page / Home Page',
										'text-to-speech-player'
									) }
									help={ __(
										'Prevent the audio player from automatically appearing on your main homepage or front page. Custom shortcodes will continue to work.',
										'text-to-speech-player'
									) }
									checked={
										!! settings.disable_on_front_page
									}
									onChange={ ( val ) =>
										updateSetting(
											'disable_on_front_page',
											val
										)
									}
								/>
							</div>

							<div
								style={ {
									marginTop: '20px',
									borderTop: '1px solid #f1f5f9',
									paddingTop: '20px',
								} }
							>
								<ToggleControl
									label={ __(
										'Delete Data on Uninstall',
										'text-to-speech-player'
									) }
									help={ __(
										'Completely wipe plugin settings and dictionary when the plugin is deleted.',
										'text-to-speech-player'
									) }
									checked={
										!! settings.delete_data_on_uninstall
									}
									onChange={ ( val ) =>
										updateSetting(
											'delete_data_on_uninstall',
											val
										)
									}
								/>
							</div>
						</div>

						{ /* Content Ingestion & Spoken Audio Options */ }
						<div
							className="tts-card"
							style={ { marginTop: '24px' } }
						>
							<h2 className="tts-card-title">
								{ __(
									'Content Ingestion & Spoken Audio Options',
									'text-to-speech-player'
								) }
							</h2>
							<p className="tts-card-desc">
								{ __(
									'Define what content is converted into audio, including titles, excerpts, custom intros, and target CSS containers.',
									'text-to-speech-player'
								) }
							</p>

							<div
								style={ {
									display: 'grid',
									gridTemplateColumns: '1fr 1fr',
									gap: '20px',
								} }
							>
								<ToggleControl
									label={ __(
										'Include Post Title in Audio',
										'text-to-speech-player'
									) }
									help={ __(
										'Speaks the article title before the main article body.',
										'text-to-speech-player'
									) }
									checked={ !! settings.include_post_title }
									onChange={ ( val ) =>
										updateSetting(
											'include_post_title',
											val
										)
									}
								/>
								<ToggleControl
									label={ __(
										'Include Post Excerpt in Audio',
										'text-to-speech-player'
									) }
									help={ __(
										'Speaks the post excerpt or summary before the main body.',
										'text-to-speech-player'
									) }
									checked={ !! settings.include_post_excerpt }
									onChange={ ( val ) =>
										updateSetting(
											'include_post_excerpt',
											val
										)
									}
								/>
							</div>

							<div
								className="tts-form-row"
								style={ { marginTop: '16px' } }
							>
								<TextControl
									label={ __(
										'Spoken Intro Text (Spoken before content)',
										'text-to-speech-player'
									) }
									value={ settings.text_before_content || '' }
									placeholder={ __(
										'e.g. Welcome. Listening to an article by Our Team.',
										'text-to-speech-player'
									) }
									help={ __(
										'Custom announcement spoken immediately before reading begins.',
										'text-to-speech-player'
									) }
									onChange={ ( val ) =>
										updateSetting(
											'text_before_content',
											val
										)
									}
								/>
							</div>

							<div
								className="tts-form-row"
								style={ { marginTop: '16px' } }
							>
								<TextControl
									label={ __(
										'Spoken Outro Text (Spoken after content)',
										'text-to-speech-player'
									) }
									value={ settings.text_after_content || '' }
									placeholder={ __(
										'e.g. Thank you for listening. Visit our website for more updates.',
										'text-to-speech-player'
									) }
									help={ __(
										'Custom closing phrase spoken when article reading finishes.',
										'text-to-speech-player'
									) }
									onChange={ ( val ) =>
										updateSetting(
											'text_after_content',
											val
										)
									}
								/>
							</div>

							<div
								className="tts-form-row"
								style={ { marginTop: '16px' } }
							>
								<SelectControl
									label={ __(
										'Theme Content Container Preset',
										'text-to-speech-player'
									) }
									value={ settings.theme_preset || 'auto' }
									options={ [
										{
											label: __(
												'Auto Detect (Recommended)',
												'text-to-speech-player'
											),
											value: 'auto',
										},
										{
											label: __(
												'WordPress Block Themes (Twenty Twenty-Four, TT3)',
												'text-to-speech-player'
											),
											value: 'block_theme',
										},
										{
											label: __(
												'Astra Theme',
												'text-to-speech-player'
											),
											value: 'astra',
										},
										{
											label: __(
												'GeneratePress Theme',
												'text-to-speech-player'
											),
											value: 'generatepress',
										},
										{
											label: __(
												'Kadence Theme',
												'text-to-speech-player'
											),
											value: 'kadence',
										},
										{
											label: __(
												'Elementor Page Builder',
												'text-to-speech-player'
											),
											value: 'elementor',
										},
										{
											label: __(
												'Divi Builder',
												'text-to-speech-player'
											),
											value: 'divi',
										},
									] }
									help={ __(
										'Pre-configured content container selector for popular themes. Automatically locates the post body without typing CSS selectors.',
										'text-to-speech-player'
									) }
									onChange={ ( val ) =>
										updateSetting( 'theme_preset', val )
									}
								/>
							</div>

							<div
								className="tts-form-row"
								style={ { marginTop: '16px' } }
							>
								<TextControl
									label={ __(
										'Target CSS Selectors (Optional)',
										'text-to-speech-player'
									) }
									value={ settings.css_selectors || '' }
									placeholder={ __(
										'.entry-content, .custom-article-body',
										'text-to-speech-player'
									) }
									help={ __(
										'Only read text inside these specific CSS selectors. Leave empty to automatically read standard post content.',
										'text-to-speech-player'
									) }
									onChange={ ( val ) =>
										updateSetting( 'css_selectors', val )
									}
								/>
							</div>

							<div
								className="tts-form-row"
								style={ { marginTop: '16px' } }
							>
								<TextControl
									label={ __(
										'Exclude CSS Selectors',
										'text-to-speech-player'
									) }
									value={
										settings.exclude_css_selectors || ''
									}
									placeholder={ __(
										'.ad-box, .social-share, .related-posts, .author-bio',
										'text-to-speech-player'
									) }
									help={ __(
										'Strip content matching these selectors before speech synthesis.',
										'text-to-speech-player'
									) }
									onChange={ ( val ) =>
										updateSetting(
											'exclude_css_selectors',
											val
										)
									}
								/>
							</div>

							<div
								className="tts-form-row"
								style={ { marginTop: '16px' } }
							>
								<TextControl
									label={ __(
										'Exclude HTML Tags',
										'text-to-speech-player'
									) }
									value={
										settings.exclude_tags !== undefined
											? settings.exclude_tags
											: 'aside|figure|blockquote|script|style|figcaption|code|pre'
									}
									placeholder={ __(
										'aside|figure|blockquote|script|style|figcaption|code|pre',
										'text-to-speech-player'
									) }
									help={ __(
										'Pipe-separated list of HTML tag names to omit from speech synthesis.',
										'text-to-speech-player'
									) }
									onChange={ ( val ) =>
										updateSetting( 'exclude_tags', val )
									}
								/>
							</div>

							<div
								className="tts-form-row"
								style={ { marginTop: '16px' } }
							>
								<TextareaControl
									label={ __(
										'Exclude Specific Words or Phrases',
										'text-to-speech-player'
									) }
									value={ settings.exclude_texts || '' }
									placeholder={ __(
										'Sponsored Content\nClick here to read more\nShare on Twitter',
										'text-to-speech-player'
									) }
									help={ __(
										'Enter phrases or sentences to redact from the spoken audio (one per line or pipe-separated).',
										'text-to-speech-player'
									) }
									onChange={ ( val ) =>
										updateSetting( 'exclude_texts', val )
									}
									rows={ 3 }
								/>
							</div>

							<div
								style={ {
									marginTop: '20px',
									borderTop: '1px solid #f1f5f9',
									paddingTop: '20px',
								} }
							>
								<ToggleControl
									label={ __(
										'DOM Reading Mode (Dynamic Builder Fallback)',
										'text-to-speech-player'
									) }
									help={ __(
										'Extracts speakable content directly from the live browser DOM. Recommended if using Elementor, Divi, Bricks, or AJAX-rendered blocks.',
										'text-to-speech-player'
									) }
									checked={
										!! settings.read_content_from_dom
									}
									onChange={ ( val ) =>
										updateSetting(
											'read_content_from_dom',
											val
										)
									}
								/>
							</div>
						</div>

						{ /* Audience Access & Inactivity Controls */ }
						<div
							className="tts-card"
							style={ { marginTop: '24px' } }
						>
							<h2 className="tts-card-title">
								{ __(
									'Audience Access & Playback Rules',
									'text-to-speech-player'
								) }
							</h2>
							<p className="tts-card-desc">
								{ __(
									'Control visibility by user role, exclude individual posts, and manage background tab playback.',
									'text-to-speech-player'
								) }
							</p>

							<div className="tts-form-row">
								<SelectControl
									label={ __(
										'Who Can See & Listen to Player',
										'text-to-speech-player'
									) }
									value={
										Array.isArray(
											settings.display_player_to
										) && settings.display_player_to.length
											? settings.display_player_to[ 0 ]
											: 'all'
									}
									options={ [
										{
											label: __(
												'All Visitors (Public)',
												'text-to-speech-player'
											),
											value: 'all',
										},
										{
											label: __(
												'Logged-in Members Only',
												'text-to-speech-player'
											),
											value: 'logged_in',
										},
										{
											label: __(
												'Administrators Only (Testing Mode)',
												'text-to-speech-player'
											),
											value: 'administrator',
										},
										{
											label: __(
												'Subscribers & Members Only',
												'text-to-speech-player'
											),
											value: 'subscriber',
										},
									] }
									onChange={ ( val ) =>
										updateSetting( 'display_player_to', [
											val,
										] )
									}
									help={ __(
										'Restrict audio player to VIP members or keep it available to all public visitors.',
										'text-to-speech-player'
									) }
								/>
							</div>

							<div
								className="tts-form-row"
								style={ { marginTop: '16px' } }
							>
								<TextControl
									label={ __(
										'Exclude Specific Post IDs',
										'text-to-speech-player'
									) }
									value={ settings.exclude_post_ids || '' }
									placeholder={ __(
										'e.g. 12, 45, 102',
										'text-to-speech-player'
									) }
									help={ __(
										'Comma-separated list of Post IDs where audio should never be displayed.',
										'text-to-speech-player'
									) }
									onChange={ ( val ) =>
										updateSetting( 'exclude_post_ids', val )
									}
								/>
							</div>

							<div
								style={ {
									marginTop: '20px',
									borderTop: '1px solid #f1f5f9',
									paddingTop: '20px',
								} }
							>
								<ToggleControl
									label={ __(
										'Auto-Pause When Switching Browser Tabs',
										'text-to-speech-player'
									) }
									help={ __(
										'Automatically pauses speech synthesis when the visitor navigates away to another browser tab.',
										'text-to-speech-player'
									) }
									checked={
										settings.stop_on_tab_switch !== false
									}
									onChange={ ( val ) =>
										updateSetting(
											'stop_on_tab_switch',
											val
										)
									}
								/>
							</div>
						</div>

						{ /* Shortcodes & Custom Play Button Guide */ }
						<div
							className="tts-card"
							style={ { marginTop: '24px' } }
						>
							<div
								style={ {
									display: 'flex',
									alignItems: 'center',
									gap: '10px',
									marginBottom: '8px',
								} }
							>
								<span
									style={ {
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										width: '28px',
										height: '28px',
										borderRadius: '6px',
										background: '#e0e7ff',
										color: '#4f46e5',
									} }
								>
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M8 5v14l11-7z" />
									</svg>
								</span>
								<h2
									className="tts-card-title"
									style={ { margin: 0 } }
								>
									{ __(
										'Custom Shortcode & Play Button Guide',
										'text-to-speech-player'
									) }
								</h2>
							</div>
							<p className="tts-card-desc">
								{ __(
									'Display a custom audio reader button anywhere on your site: in pages, homepages, sidebars, widgets, or theme templates.',
									'text-to-speech-player'
								) }
							</p>

							<div
								style={ {
									display: 'grid',
									gridTemplateColumns:
										'repeat(auto-fit, minmax(320px, 1fr))',
									gap: '16px',
									marginTop: '16px',
								} }
							>
								<div
									style={ {
										background: '#f8fafc',
										border: '1px solid #e2e8f0',
										borderRadius: '8px',
										padding: '16px',
									} }
								>
									<div
										style={ {
											fontWeight: 600,
											fontSize: '13px',
											color: '#0f172a',
											marginBottom: '4px',
										} }
									>
										{ __(
											'1. Standard Player (Current Page/Post)',
											'text-to-speech-player'
										) }
									</div>
									<p
										style={ {
											fontSize: '12px',
											color: '#64748b',
											margin: '0 0 8px',
										} }
									>
										{ __(
											'Converts and reads the current post or page content.',
											'text-to-speech-player'
										) }
									</p>
									<code
										style={ {
											display: 'block',
											background: '#ffffff',
											border: '1px solid #cbd5e1',
											borderRadius: '4px',
											padding: '6px 10px',
											fontSize: '12px',
											color: '#0f172a',
											userSelect: 'all',
										} }
									>
										[tts_player]
									</code>
								</div>

								<div
									style={ {
										background: '#f8fafc',
										border: '1px solid #e2e8f0',
										borderRadius: '8px',
										padding: '16px',
									} }
								>
									<div
										style={ {
											fontWeight: 600,
											fontSize: '13px',
											color: '#0f172a',
											marginBottom: '4px',
										} }
									>
										{ __(
											'2. Custom Spoken Text (Hero / Greeting)',
											'text-to-speech-player'
										) }
									</div>
									<p
										style={ {
											fontSize: '12px',
											color: '#64748b',
											margin: '0 0 8px',
										} }
									>
										{ __(
											'Speaks custom arbitrary text instead of page body.',
											'text-to-speech-player'
										) }
									</p>
									<code
										style={ {
											display: 'block',
											background: '#ffffff',
											border: '1px solid #cbd5e1',
											borderRadius: '4px',
											padding: '6px 10px',
											fontSize: '12px',
											color: '#0f172a',
											userSelect: 'all',
										} }
									>
										[tts_player text="Welcome to our
										website! Listen to our introduction."]
									</code>
								</div>

								<div
									style={ {
										background: '#f8fafc',
										border: '1px solid #e2e8f0',
										borderRadius: '8px',
										padding: '16px',
									} }
								>
									<div
										style={ {
											fontWeight: 600,
											fontSize: '13px',
											color: '#0f172a',
											marginBottom: '4px',
										} }
									>
										{ __(
											'3. Custom Labels & Styling Override',
											'text-to-speech-player'
										) }
									</div>
									<p
										style={ {
											fontSize: '12px',
											color: '#64748b',
											margin: '0 0 8px',
										} }
									>
										{ __(
											'Customize theme, accent color, radius, and button text.',
											'text-to-speech-player'
										) }
									</p>
									<code
										style={ {
											display: 'block',
											background: '#ffffff',
											border: '1px solid #cbd5e1',
											borderRadius: '4px',
											padding: '6px 10px',
											fontSize: '12px',
											color: '#0f172a',
											userSelect: 'all',
										} }
									>
										[tts_player theme="solid"
										accent="#e11d48" radius="pill"
										size="large" listen_text="Listen to
										Audio Intro"]
									</code>
								</div>

								<div
									style={ {
										background: '#f8fafc',
										border: '1px solid #e2e8f0',
										borderRadius: '8px',
										padding: '16px',
									} }
								>
									<div
										style={ {
											fontWeight: 600,
											fontSize: '13px',
											color: '#0f172a',
											marginBottom: '4px',
										} }
									>
										{ __(
											'4. Custom MP3 Audio File Player',
											'text-to-speech-player'
										) }
									</div>
									<p
										style={ {
											fontSize: '12px',
											color: '#64748b',
											margin: '0 0 8px',
										} }
									>
										{ __(
											'Plays pre-recorded podcast or narration audio file.',
											'text-to-speech-player'
										) }
									</p>
									<code
										style={ {
											display: 'block',
											background: '#ffffff',
											border: '1px solid #cbd5e1',
											borderRadius: '4px',
											padding: '6px 10px',
											fontSize: '12px',
											color: '#0f172a',
											userSelect: 'all',
										} }
									>
										[tts_player
										audio_url="https://example.com/audio.mp3"
										listen_text="Play Podcast"]
									</code>
								</div>

								<div
									style={ {
										background: '#f8fafc',
										border: '1px solid #e2e8f0',
										borderRadius: '8px',
										padding: '16px',
									} }
								>
									<div
										style={ {
											fontWeight: 600,
											fontSize: '13px',
											color: '#0f172a',
											marginBottom: '4px',
										} }
									>
										{ __(
											'5. Enclosed Text Block',
											'text-to-speech-player'
										) }
									</div>
									<p
										style={ {
											fontSize: '12px',
											color: '#64748b',
											margin: '0 0 8px',
										} }
									>
										{ __(
											'Wrap any specific paragraph or text inside shortcode tags.',
											'text-to-speech-player'
										) }
									</p>
									<code
										style={ {
											display: 'block',
											background: '#ffffff',
											border: '1px solid #cbd5e1',
											borderRadius: '4px',
											padding: '6px 10px',
											fontSize: '12px',
											color: '#0f172a',
											userSelect: 'all',
										} }
									>
										[tts_player]This exact text will be
										spoken aloud.[/tts_player]
									</code>
								</div>

								<div
									style={ {
										background: '#f8fafc',
										border: '1px solid #e2e8f0',
										borderRadius: '8px',
										padding: '16px',
									} }
								>
									<div
										style={ {
											fontWeight: 600,
											fontSize: '13px',
											color: '#0f172a',
											marginBottom: '4px',
										} }
									>
										{ __(
											'6. Sticky Fixed Floating Player',
											'text-to-speech-player'
										) }
									</div>
									<p
										style={ {
											fontSize: '12px',
											color: '#64748b',
											margin: '0 0 8px',
										} }
									>
										{ __(
											'Attach a fixed floating player to any screen corner with custom X/Y coordinates.',
											'text-to-speech-player'
										) }
									</p>
									<code
										style={ {
											display: 'block',
											background: '#ffffff',
											border: '1px solid #cbd5e1',
											borderRadius: '4px',
											padding: '6px 10px',
											fontSize: '12px',
											color: '#0f172a',
											userSelect: 'all',
										} }
									>
										[tts_player position="sticky"
										sticky_position="bottom_right"
										offset_x="24" offset_y="24"]
									</code>
								</div>

								<div
									style={ {
										background: '#f8fafc',
										border: '1px solid #e2e8f0',
										borderRadius: '8px',
										padding: '16px',
									} }
								>
									<div
										style={ {
											fontWeight: 600,
											fontSize: '13px',
											color: '#0f172a',
											marginBottom: '4px',
										} }
									>
										{ __(
											'7. PHP Theme Template Integration',
											'text-to-speech-player'
										) }
									</div>
									<p
										style={ {
											fontSize: '12px',
											color: '#64748b',
											margin: '0 0 8px',
										} }
									>
										{ __(
											'Directly embed in header.php, front-page.php, or single.php.',
											'text-to-speech-player'
										) }
									</p>
									<code
										style={ {
											display: 'block',
											background: '#ffffff',
											border: '1px solid #cbd5e1',
											borderRadius: '4px',
											padding: '6px 10px',
											fontSize: '12px',
											color: '#0f172a',
											userSelect: 'all',
										} }
									>
										{
											"<?php echo do_shortcode( '[tts_player]' ); ?>"
										}
									</code>
								</div>
							</div>
						</div>
					</>
				) }

				{ /* 2. TAB: APPEARANCE */ }
				{ activeTab === 'appearance' && (
					<div className="tts-card">
						<h2 className="tts-card-title">
							{ __(
								'Player Appearance & Theme',
								'text-to-speech-player'
							) }
						</h2>
						<p className="tts-card-desc">
							{ __(
								'Customize the visual presentation of your audio reader button.',
								'text-to-speech-player'
							) }
						</p>

						<div className="tts-form-row">
							<TextControl
								label={ __(
									'Button Label',
									'text-to-speech-player'
								) }
								value={
									settings.button_label !== undefined
										? settings.button_label
										: 'Listen to this article'
								}
								placeholder={ __(
									'Leave blank for icon-only button',
									'text-to-speech-player'
								) }
								help={ __(
									'Text displayed on the audio player button. Leave completely blank for a compact, icon-only button.',
									'text-to-speech-player'
								) }
								onChange={ ( val ) =>
									updateSetting( 'button_label', val )
								}
							/>
						</div>

						{ /* Multi-State Button Labels */ }
						<div
							style={ {
								marginTop: '16px',
								background: '#f8fafc',
								padding: '16px',
								borderRadius: '8px',
								border: '1px solid #e2e8f0',
							} }
						>
							<h3
								style={ {
									fontSize: '13px',
									fontWeight: 600,
									color: '#334155',
									margin: '0 0 10px 0',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
								} }
							>
								{ __(
									'Dynamic Button State Labels',
									'text-to-speech-player'
								) }
							</h3>
							<div
								style={ {
									display: 'grid',
									gridTemplateColumns: '1fr 1fr',
									gap: '14px',
								} }
							>
								<TextControl
									label={ __(
										'Listen / Initial Text',
										'text-to-speech-player'
									) }
									value={
										settings.listen_text !== undefined
											? settings.listen_text
											: settings.button_label ||
											  'Listen to this article'
									}
									onChange={ ( val ) =>
										updateSetting( 'listen_text', val )
									}
								/>
								<TextControl
									label={ __(
										'Playing / Pause Text',
										'text-to-speech-player'
									) }
									value={ settings.pause_text || 'Pause' }
									onChange={ ( val ) =>
										updateSetting( 'pause_text', val )
									}
								/>
								<TextControl
									label={ __(
										'Paused / Resume Text',
										'text-to-speech-player'
									) }
									value={ settings.resume_text || 'Resume' }
									onChange={ ( val ) =>
										updateSetting( 'resume_text', val )
									}
								/>
								<TextControl
									label={ __(
										'Completed / Replay Text',
										'text-to-speech-player'
									) }
									value={
										settings.replay_text || 'Listen again'
									}
									onChange={ ( val ) =>
										updateSetting( 'replay_text', val )
									}
								/>
							</div>
						</div>

						<div
							className="tts-form-row"
							style={ { marginTop: '16px' } }
						>
							<ToggleControl
								label={ __(
									'Show Estimated Listening Time Badge',
									'text-to-speech-player'
								) }
								help={ __(
									'Displays a smart reading time badge (e.g. 🎧 3 min listen) beside the player.',
									'text-to-speech-player'
								) }
								checked={
									settings.show_listen_time !== undefined
										? !! settings.show_listen_time
										: true
								}
								onChange={ ( val ) =>
									updateSetting( 'show_listen_time', val )
								}
							/>
						</div>

						<div className="tts-form-row">
							<ToggleControl
								label={ __(
									'Enable MP3 Download Button',
									'text-to-speech-player'
								) }
								help={ __(
									'Displays a direct download icon on the player when a custom MP3 audio file is uploaded to the post.',
									'text-to-speech-player'
								) }
								checked={ !! settings.enable_download_button }
								onChange={ ( val ) =>
									updateSetting(
										'enable_download_button',
										val
									)
								}
							/>
						</div>

						<div className="tts-form-row">
							<ToggleControl
								label={ __(
									'Enable Keyboard Accessibility Shortcuts',
									'text-to-speech-player'
								) }
								help={ __(
									'Enables keyboard control (Space / K to play/pause, Left / Right arrows or J / L to rewind/fast-forward 10 seconds).',
									'text-to-speech-player'
								) }
								checked={
									settings.enable_keyboard_shortcuts !==
									undefined
										? !! settings.enable_keyboard_shortcuts
										: true
								}
								onChange={ ( val ) =>
									updateSetting(
										'enable_keyboard_shortcuts',
										val
									)
								}
							/>
						</div>

						<div
							className="tts-form-row"
							style={ { marginTop: '16px' } }
						>
							<SelectControl
								label={ __(
									'Color Theme',
									'text-to-speech-player'
								) }
								value={
									settings.player_theme || 'modern_light'
								}
								options={ [
									{
										label: __(
											'Modern Light (Default)',
											'text-to-speech-player'
										),
										value: 'modern_light',
									},
									{
										label: __(
											'Dark Glassmorphism',
											'text-to-speech-player'
										),
										value: 'dark_glass',
									},
									{
										label: __(
											'Solid Accent (Filled Background)',
											'text-to-speech-player'
										),
										value: 'solid',
									},
									{
										label: __(
											'Minimalist Outline',
											'text-to-speech-player'
										),
										value: 'outline',
									},
									{
										label: __(
											'Soft Pastel Tint',
											'text-to-speech-player'
										),
										value: 'soft_tint',
									},
								] }
								onChange={ ( val ) =>
									updateSetting( 'player_theme', val )
								}
							/>
						</div>

						<div className="tts-form-row">
							<label>
								{ __(
									'Accent Color',
									'text-to-speech-player'
								) }
							</label>
							<div
								style={ {
									display: 'flex',
									alignItems: 'center',
									gap: '10px',
								} }
							>
								<input
									type="color"
									value={ settings.accent_color || '#1a73e8' }
									onChange={ ( e ) =>
										updateSetting(
											'accent_color',
											e.target.value
										)
									}
									style={ {
										width: '40px',
										height: '40px',
										padding: 0,
										border: 'none',
										cursor: 'pointer',
										borderRadius: '6px',
									} }
								/>
								<TextControl
									value={ settings.accent_color || '#1a73e8' }
									onChange={ ( val ) =>
										updateSetting( 'accent_color', val )
									}
								/>
							</div>
							{ /* Preset Swatches */ }
							<div
								style={ {
									display: 'flex',
									gap: '8px',
									marginTop: '6px',
								} }
							>
								{ [
									'#1a73e8',
									'#10b981',
									'#7c3aed',
									'#e11d48',
									'#f59e0b',
									'#0f172a',
								].map( ( c ) => (
									<button
										key={ c }
										type="button"
										onClick={ () =>
											updateSetting( 'accent_color', c )
										}
										style={ {
											width: '22px',
											height: '22px',
											borderRadius: '50%',
											backgroundColor: c,
											border:
												settings.accent_color === c
													? '2px solid #000'
													: '1px solid #cbd5e1',
											cursor: 'pointer',
										} }
									/>
								) ) }
							</div>
						</div>

						<div className="tts-form-row">
							<SelectControl
								label={ __(
									'Button Border Radius',
									'text-to-speech-player'
								) }
								value={ settings.button_radius || 'pill' }
								options={ [
									{
										label: __(
											'Pill (Full Rounded - 9999px)',
											'text-to-speech-player'
										),
										value: 'pill',
									},
									{
										label: __(
											'Large Rounded (16px)',
											'text-to-speech-player'
										),
										value: 'rounded_lg',
									},
									{
										label: __(
											'Medium Rounded (8px)',
											'text-to-speech-player'
										),
										value: 'rounded_md',
									},
									{
										label: __(
											'Slight Rounded / Sharp (4px)',
											'text-to-speech-player'
										),
										value: 'sharp',
									},
									{
										label: __(
											'Square (0px)',
											'text-to-speech-player'
										),
										value: 'square',
									},
								] }
								onChange={ ( val ) =>
									updateSetting( 'button_radius', val )
								}
							/>
						</div>

						<div className="tts-form-row">
							<SelectControl
								label={ __(
									'Button Size',
									'text-to-speech-player'
								) }
								value={ settings.button_size || 'medium' }
								options={ [
									{
										label: __(
											'Small (Compact)',
											'text-to-speech-player'
										),
										value: 'small',
									},
									{
										label: __(
											'Medium (Standard)',
											'text-to-speech-player'
										),
										value: 'medium',
									},
									{
										label: __(
											'Large (Prominent)',
											'text-to-speech-player'
										),
										value: 'large',
									},
								] }
								onChange={ ( val ) =>
									updateSetting( 'button_size', val )
								}
							/>
						</div>

						<div
							style={ {
								marginTop: '20px',
								borderTop: '1px solid #f1f5f9',
								paddingTop: '20px',
							} }
						>
							<ToggleControl
								label={ __(
									'Read-Along Synchronized Highlighting',
									'text-to-speech-player'
								) }
								help={ __(
									'Highlights text on the page in real-time as the speech engine reads it.',
									'text-to-speech-player'
								) }
								checked={ !! settings.enable_highlighting }
								onChange={ ( val ) =>
									updateSetting( 'enable_highlighting', val )
								}
							/>
						</div>

						{ !! settings.enable_highlighting && (
							<div
								style={ {
									marginTop: '14px',
									paddingLeft: '8px',
									borderLeft: '3px solid #1a73e8',
								} }
							>
								<div className="tts-form-row">
									<SelectControl
										label={ __(
											'Highlighting Mode',
											'text-to-speech-player'
										) }
										value={
											settings.highlight_mode || 'word'
										}
										options={ [
											{
												label: __(
													'Word Only (Highlights active word)',
													'text-to-speech-player'
												),
												value: 'word',
											},
											{
												label: __(
													'Sentence Only (Tints active sentence)',
													'text-to-speech-player'
												),
												value: 'sentence',
											},
											{
												label: __(
													'Dual Mode: Sentence Background + Word Focus (AtlasVoice Signature)',
													'text-to-speech-player'
												),
												value: 'word_sentence',
											},
										] }
										onChange={ ( val ) =>
											updateSetting(
												'highlight_mode',
												val
											)
										}
									/>
								</div>

								{ ( settings.highlight_mode === 'sentence' ||
									settings.highlight_mode ===
										'word_sentence' ) && (
									<div
										className="tts-form-row"
										style={ { marginTop: '12px' } }
									>
										<label>
											{ __(
												'Sentence Background Color',
												'text-to-speech-player'
											) }
										</label>
										<div
											style={ {
												display: 'flex',
												alignItems: 'center',
												gap: '10px',
											} }
										>
											<input
												type="color"
												value={
													settings.highlight_sentence_bg ||
													'#e8e7fe'
												}
												onChange={ ( e ) =>
													updateSetting(
														'highlight_sentence_bg',
														e.target.value
													)
												}
												style={ {
													width: '40px',
													height: '40px',
													padding: 0,
													border: 'none',
													cursor: 'pointer',
													borderRadius: '6px',
												} }
											/>
											<TextControl
												value={
													settings.highlight_sentence_bg ||
													'#e8e7fe'
												}
												onChange={ ( val ) =>
													updateSetting(
														'highlight_sentence_bg',
														val
													)
												}
											/>
										</div>
										<div
											style={ {
												display: 'flex',
												gap: '8px',
												marginTop: '6px',
											} }
										>
											{ [
												'#e8e7fe',
												'#dbeafe',
												'#dcfce7',
												'#ffedd5',
												'#f3e8ff',
												'#fce7f3',
											].map( ( c ) => (
												<button
													key={ c }
													type="button"
													title={ c }
													onClick={ () =>
														updateSetting(
															'highlight_sentence_bg',
															c
														)
													}
													style={ {
														width: '22px',
														height: '22px',
														borderRadius: '50%',
														backgroundColor: c,
														border:
															( settings.highlight_sentence_bg ||
																'#e8e7fe' ) ===
															c
																? '2px solid #000'
																: '1px solid #cbd5e1',
														cursor: 'pointer',
													} }
												/>
											) ) }
										</div>
									</div>
								) }

								{ ( settings.highlight_mode === 'word' ||
									settings.highlight_mode ===
										'word_sentence' ||
									! settings.highlight_mode ) && (
									<div
										className="tts-form-row"
										style={ { marginTop: '12px' } }
									>
										<label>
											{ __(
												'Word Focus Highlight Color',
												'text-to-speech-player'
											) }
										</label>
										<div
											style={ {
												display: 'flex',
												alignItems: 'center',
												gap: '10px',
											} }
										>
											<input
												type="color"
												value={
													settings.highlight_color ||
													'#fef08a'
												}
												onChange={ ( e ) =>
													updateSetting(
														'highlight_color',
														e.target.value
													)
												}
												style={ {
													width: '40px',
													height: '40px',
													padding: 0,
													border: 'none',
													cursor: 'pointer',
													borderRadius: '6px',
												} }
											/>
											<TextControl
												value={
													settings.highlight_color ||
													'#fef08a'
												}
												onChange={ ( val ) =>
													updateSetting(
														'highlight_color',
														val
													)
												}
											/>
										</div>
										<div
											style={ {
												display: 'flex',
												gap: '8px',
												marginTop: '6px',
											} }
										>
											{ [
												'#fef08a',
												'#bae6fd',
												'#bbf7d0',
												'#fed7aa',
												'#e9d5ff',
												'#fed7d7',
											].map( ( c ) => (
												<button
													key={ c }
													type="button"
													title={ c }
													onClick={ () =>
														updateSetting(
															'highlight_color',
															c
														)
													}
													style={ {
														width: '22px',
														height: '22px',
														borderRadius: '50%',
														backgroundColor: c,
														border:
															( settings.highlight_color ||
																'#fef08a' ) ===
															c
																? '2px solid #000'
																: '1px solid #cbd5e1',
														cursor: 'pointer',
													} }
												/>
											) ) }
										</div>
									</div>
								) }

								<div
									style={ {
										marginTop: '16px',
										borderTop: '1px dashed #e2e8f0',
										paddingTop: '16px',
									} }
								>
									<ToggleControl
										label={ __(
											'Focus Dimming (ADHD & Dyslexia Friendly)',
											'text-to-speech-player'
										) }
										help={ __(
											'Gently reduces opacity of non-spoken article paragraphs during playback for maximum reading concentration.',
											'text-to-speech-player'
										) }
										checked={ !! settings.dim_enabled }
										onChange={ ( val ) =>
											updateSetting( 'dim_enabled', val )
										}
									/>

									{ !! settings.dim_enabled && (
										<div
											className="tts-form-row"
											style={ {
												marginTop: '10px',
												maxWidth: '300px',
											} }
										>
											<SelectControl
												label={ __(
													'Inactive Text Opacity',
													'text-to-speech-player'
												) }
												value={ formatSelectFloat(
													settings.dim_opacity,
													'0.7'
												) }
												options={ [
													{
														label: '50% (Strong Focus Dimming)',
														value: '0.5',
													},
													{
														label: '65% (Recommended - Natural Focus)',
														value: '0.65',
													},
													{
														label: '75% (Subtle Dimming)',
														value: '0.75',
													},
													{
														label: '85% (Very Light Dimming)',
														value: '0.85',
													},
												] }
												onChange={ ( val ) =>
													updateSetting(
														'dim_opacity',
														parseFloat( val )
													)
												}
											/>
										</div>
									) }
								</div>

								<div
									style={ {
										marginTop: '16px',
										borderTop: '1px dashed #e2e8f0',
										paddingTop: '16px',
									} }
								>
									<ToggleControl
										label={ __(
											'Enable Floating Selection Reader ("Listen to selection")',
											'text-to-speech-player'
										) }
										help={ __(
											'Displays a floating "Listen" tooltip when readers highlight any text with their cursor.',
											'text-to-speech-player'
										) }
										checked={
											settings.enable_selection_reader !==
											false
										}
										onChange={ ( val ) =>
											updateSetting(
												'enable_selection_reader',
												val
											)
										}
									/>
								</div>
							</div>
						) }

						{ /* Live Interactive Player Preview Card */ }
						{ ( () => {
							const radiusMap = {
								pill: '9999px',
								rounded_lg: '16px',
								rounded_md: '8px',
								sharp: '4px',
								square: '0px',
							};
							const currentRadius =
								radiusMap[ settings.button_radius ] || '9999px';
							const isIconOnly =
								settings.button_label !== undefined
									? settings.button_label.trim() === ''
									: false;
							const displayLabel =
								settings.button_label !== undefined
									? settings.button_label
									: __(
											'Listen to this article',
											'text-to-speech-player'
									  );

							return (
								<div className="tts-admin-player-preview">
									<div className="tts-preview-header">
										<span className="tts-preview-title">
											<svg
												width="15"
												height="15"
												viewBox="0 0 24 24"
												fill={
													settings.accent_color ||
													'#1a73e8'
												}
											>
												<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
											</svg>
											{ __(
												'Live Player Preview',
												'text-to-speech-player'
											) }
										</span>
										<span
											className={ `tts-preview-badge ${
												previewPlaying
													? 'tts-playing'
													: ''
											}` }
										>
											{ previewPlaying
												? __(
														'🔊 Playing Audio...',
														'text-to-speech-player'
												  )
												: __(
														'Interactive Preview',
														'text-to-speech-player'
												  ) }
										</span>
									</div>

									<div
										className={ `tts-preview-stage ${
											settings.player_theme ===
											'dark_glass'
												? 'tts-stage-dark'
												: ''
										}` }
									>
										<div
											className={ `tts-player-container tts-player-theme-${
												settings.player_theme ||
												'modern_light'
											} tts-player-radius-${
												settings.button_radius || 'pill'
											} tts-player-size-${
												settings.button_size || 'medium'
											} ${
												isIconOnly
													? 'tts-player-icon-only'
													: ''
											}` }
											style={ {
												'--tts-accent':
													settings.accent_color ||
													'#1a73e8',
												'--tts-radius': currentRadius,
											} }
										>
											<div className="tts-player-bar">
												<button
													type="button"
													className="tts-player-toggle"
													onClick={
														togglePreviewPlay
													}
													aria-label={
														! isIconOnly
															? displayLabel
															: __(
																	'Listen to this article',
																	'text-to-speech-player'
															  )
													}
													title={
														! isIconOnly
															? displayLabel
															: __(
																	'Listen to this article',
																	'text-to-speech-player'
															  )
													}
												>
													<span
														className="tts-icon-play"
														style={ {
															display:
																previewPlaying
																	? 'none'
																	: 'inline-block',
														} }
													>
														<svg
															width="18"
															height="18"
															viewBox="0 0 24 24"
															fill="currentColor"
														>
															<path d="M8 5v14l11-7z" />
														</svg>
													</span>
													<span
														className="tts-icon-pause"
														style={ {
															display:
																previewPlaying
																	? 'inline-block'
																	: 'none',
														} }
													>
														<svg
															width="18"
															height="18"
															viewBox="0 0 24 24"
															fill="currentColor"
														>
															<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
														</svg>
													</span>
													{ ! isIconOnly && (
														<span className="tts-player-label">
															{ displayLabel }
														</span>
													) }
												</button>

												<div
													className="tts-player-waveform"
													style={ {
														display: previewPlaying
															? 'flex'
															: 'none',
													} }
												>
													<span className="tts-wave-bar"></span>
													<span className="tts-wave-bar"></span>
													<span className="tts-wave-bar"></span>
													<span className="tts-wave-bar"></span>
												</div>

												<div
													className="tts-player-controls"
													style={ {
														display: previewPlaying
															? 'flex'
															: 'none',
													} }
												>
													<button
														type="button"
														className="tts-player-speed"
													>
														{ formatSelectFloat(
															settings.default_rate,
															'1'
														) }
														x
													</button>
													<span className="tts-player-timer">
														0:03 / 0:18
													</span>
												</div>
											</div>
										</div>

										{ /* Real-Time Read-Along Highlight Live Demonstration */ }
										{ !! settings.enable_highlighting && (
											<div
												style={ {
													marginTop: '20px',
													padding: '14px 20px',
													background:
														settings.player_theme ===
														'dark_glass'
															? 'rgba(255, 255, 255, 0.08)'
															: '#ffffff',
													border:
														settings.player_theme ===
														'dark_glass'
															? '1px solid rgba(255, 255, 255, 0.12)'
															: '1px solid #e2e8f0',
													borderRadius: '8px',
													maxWidth: '540px',
													textAlign: 'center',
													boxShadow:
														'0 1px 3px rgba(0,0,0,0.03)',
												} }
											>
												<span
													style={ {
														display: 'block',
														fontSize: '11px',
														fontWeight: 700,
														textTransform:
															'uppercase',
														letterSpacing: '0.5px',
														marginBottom: '6px',
														color:
															settings.player_theme ===
															'dark_glass'
																? '#94a3b8'
																: '#64748b',
													} }
												>
													{ __(
														'Read-Along Real-Time Preview',
														'text-to-speech-player'
													) }
												</span>
												<p
													style={ {
														margin: 0,
														fontSize: '14px',
														lineHeight: '1.7',
														color:
															settings.player_theme ===
															'dark_glass'
																? '#f1f5f9'
																: '#1e293b',
													} }
												>
													{ previewWords.map(
														( word, idx ) => (
															<span
																key={ idx }
																className={ `tts-word ${
																	previewHighlightIdx ===
																	idx
																		? 'tts-word-active'
																		: ''
																}` }
																style={
																	previewHighlightIdx ===
																	idx
																		? {
																				backgroundColor:
																					settings.highlight_color ||
																					'#fef08a',
																				boxShadow: `0 0 0 2px ${
																					settings.highlight_color ||
																					'#fef08a'
																				}`,
																				borderRadius:
																					'3px',
																				color: '#1e293b',
																				padding:
																					'1px 3px',
																		  }
																		: {
																				padding:
																					'1px 3px',
																		  }
																}
															>
																{ word }{ ' ' }
															</span>
														)
													) }
												</p>
											</div>
										) }
									</div>

									<div className="tts-preview-footer">
										<p>
											{ __(
												'Click the player above to preview playback, voice synthesis, and real-time animation.',
												'text-to-speech-player'
											) }
										</p>
										<span
											style={ {
												fontSize: '11px',
												opacity: 0.8,
												textTransform: 'capitalize',
											} }
										>
											{ `${ (
												settings.player_theme ||
												'modern_light'
											).replace( '_', ' ' ) } · ${ (
												settings.button_radius || 'pill'
											).replace( '_', ' ' ) } · ${
												settings.button_size || 'medium'
											}` }
										</span>
									</div>
								</div>
							);
						} )() }
					</div>
				) }

				{ /* 3. TAB: VOICE & SPEECH */ }
				{ activeTab === 'voice' && (
					<div className="tts-card">
						<h2 className="tts-card-title">
							{ __(
								'Voice & Speech Engine',
								'text-to-speech-player'
							) }
						</h2>
						<p className="tts-card-desc">
							{ __(
								'Configure your default speech synthesis engine, voices, and playback speeds.',
								'text-to-speech-player'
							) }
						</p>

						<div className="tts-form-row">
							<SelectControl
								label={ __(
									'Default Speech Engine',
									'text-to-speech-player'
								) }
								value={ settings.default_engine || 'browser' }
								options={ [
									{
										label: __(
											'Free Browser Web Speech (Zero API Cost)',
											'text-to-speech-player'
										),
										value: 'browser',
									},
									{
										label: __(
											'Cloud AI Voice (OpenAI / ElevenLabs)',
											'text-to-speech-player'
										),
										value: 'cloud_ai',
									},
								] }
								onChange={ ( val ) =>
									updateSetting( 'default_engine', val )
								}
							/>
						</div>

						{ /* Browser Voices Dropdown */ }
						<div className="tts-form-row">
							<SelectControl
								label={ __(
									'Default System Voice',
									'text-to-speech-player'
								) }
								value={ settings.default_voice || '' }
								options={ [
									{
										label: __(
											'Default System Voice (Auto-detect user language)',
											'text-to-speech-player'
										),
										value: '',
									},
									...availableVoices.map( ( v ) => ( {
										label: `${ v.name } (${ v.lang })`,
										value: v.name,
									} ) ),
								] }
								onChange={ ( val ) =>
									updateSetting( 'default_voice', val )
								}
							/>
							<div style={ { marginTop: '8px' } }>
								<Button
									variant="secondary"
									onClick={ () =>
										speakPhrase(
											'This is a test of your selected voice synthesis engine.',
											settings.default_voice
										)
									}
								>
									{ __(
										'Test Selected Voice',
										'text-to-speech-player'
									) }
								</Button>
							</div>
						</div>

						<div className="tts-form-row">
							<SelectControl
								label={ __(
									'Default Playback Rate (Speed)',
									'text-to-speech-player'
								) }
								value={ formatSelectFloat(
									settings.default_rate,
									'1'
								) }
								options={ [
									{
										label: '0.8x (Slower & Deliberate)',
										value: '0.8',
									},
									{
										label: '1.0x (Standard Normal)',
										value: '1',
									},
									{
										label: '1.25x (Brisk Reading)',
										value: '1.25',
									},
									{
										label: '1.5x (Fast Listening)',
										value: '1.5',
									},
									{
										label: '2.0x (Double Speed)',
										value: '2',
									},
								] }
								onChange={ ( val ) =>
									updateSetting(
										'default_rate',
										parseFloat( val )
									)
								}
							/>
						</div>

						<div className="tts-form-row">
							<SelectControl
								label={ __(
									'Default Pitch',
									'text-to-speech-player'
								) }
								value={ formatSelectFloat(
									settings.default_pitch,
									'1'
								) }
								options={ [
									{ label: '0.8 (Deeper)', value: '0.8' },
									{
										label: '1.0 (Natural Standard)',
										value: '1',
									},
									{
										label: '1.2 (Higher Pitch)',
										value: '1.2',
									},
									{ label: '1.5 (High Pitch)', value: '1.5' },
								] }
								onChange={ ( val ) =>
									updateSetting(
										'default_pitch',
										parseFloat( val )
									)
								}
							/>
						</div>
					</div>
				) }

				{ /* 4. TAB: PRONUNCIATION DICTIONARY (ALIASES) */ }
				{ activeTab === 'pronunciation' && (
					<div>
						{ /* Add New Alias Card */ }
						<div className="tts-card">
							<h2 className="tts-card-title">
								{ __(
									'Add Pronunciation Alias',
									'text-to-speech-player'
								) }
							</h2>
							<p className="tts-card-desc">
								{ __(
									'Map abbreviations, acronyms, and technical jargon to exact phonetic pronunciations.',
									'text-to-speech-player'
								) }
							</p>

							<form onSubmit={ handleAddAlias }>
								<div
									style={ {
										display: 'grid',
										gridTemplateColumns:
											'repeat(auto-fit, minmax(240px, 1fr))',
										gap: '16px',
									} }
								>
									<div
										className="tts-form-row"
										style={ { marginBottom: 0 } }
									>
										<TextControl
											label={ __(
												'Original Word / Acronym',
												'text-to-speech-player'
											) }
											placeholder="e.g. SEO, WP, COVID-19, 5k"
											value={ newWord }
											onChange={ setNewWord }
										/>
									</div>
									<div
										className="tts-form-row"
										style={ { marginBottom: 0 } }
									>
										<TextControl
											label={ __(
												'Spoken Pronunciation',
												'text-to-speech-player'
											) }
											placeholder="e.g. Search Engine Optimization, WordPress"
											value={ newSpoken }
											onChange={ setNewSpoken }
										/>
									</div>
								</div>

								<div
									style={ {
										marginTop: '16px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										flexWrap: 'wrap',
										gap: '12px',
									} }
								>
									<label
										style={ {
											display: 'inline-flex',
											alignItems: 'center',
											gap: '8px',
											cursor: 'pointer',
											fontSize: '13px',
										} }
									>
										<input
											type="checkbox"
											checked={ newNumbers }
											onChange={ ( e ) =>
												setNewNumbers(
													e.target.checked
												)
											}
										/>
										<span>
											{ __(
												'Apply to numbers (e.g. "5k" ➔ "5 thousand", "250k" ➔ "250 thousand")',
												'text-to-speech-player'
											) }
										</span>
									</label>

									<Button
										variant="primary"
										type="submit"
										isBusy={ isSavingAlias }
										disabled={
											! newWord.trim() ||
											! newSpoken.trim() ||
											isSavingAlias
										}
									>
										{ __(
											'+ Add to Dictionary',
											'text-to-speech-player'
										) }
									</Button>
								</div>
							</form>
						</div>

						{ /* Dictionary Table Card */ }
						<div className="tts-card">
							<div
								style={ {
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									marginBottom: '16px',
								} }
							>
								<div>
									<h2
										className="tts-card-title"
										style={ { margin: 0 } }
									>
										{ __(
											'Active Pronunciation Rules',
											'text-to-speech-player'
										) }{ ' ' }
										({ aliases.length })
									</h2>
								</div>
								{ aliases.length > 0 && (
									<Button
										variant="secondary"
										isDestructive
										onClick={ () =>
											handleSaveAliases( [] )
										}
									>
										{ __(
											'Clear All Rules',
											'text-to-speech-player'
										) }
									</Button>
								) }
							</div>

							{ aliases.length === 0 ? (
								<div
									style={ {
										padding: '36px 20px',
										textAlign: 'center',
										color: '#64748b',
										background: '#f8fafc',
										borderRadius: '8px',
									} }
								>
									<p
										style={ {
											fontSize: '14px',
											margin: '0 0 12px',
										} }
									>
										{ __(
											'No custom pronunciation aliases added yet.',
											'text-to-speech-player'
										) }
									</p>
									<Button
										variant="secondary"
										onClick={ () => {
											const starters = [
												{
													id: '1',
													word: 'WP',
													spoken: 'WordPress',
													numbers: false,
												},
												{
													id: '2',
													word: 'SEO',
													spoken: 'Search Engine Optimization',
													numbers: false,
												},
												{
													id: '3',
													word: 'API',
													spoken: 'Application Programming Interface',
													numbers: false,
												},
												{
													id: '4',
													word: '5k',
													spoken: '5 thousand',
													numbers: true,
												},
											];
											setAliases( starters );
											handleSaveAliases( starters );
										} }
									>
										{ __(
											'Load Common Tech Acronyms',
											'text-to-speech-player'
										) }
									</Button>
								</div>
							) : (
								<table className="tts-data-table">
									<thead>
										<tr>
											<th>
												{ __(
													'Original Word',
													'text-to-speech-player'
												) }
											</th>
											<th>
												{ __(
													'Pronounced As',
													'text-to-speech-player'
												) }
											</th>
											<th>
												{ __(
													'Numbers Mode',
													'text-to-speech-player'
												) }
											</th>
											<th>
												{ __(
													'Audio Test',
													'text-to-speech-player'
												) }
											</th>
											<th
												style={ { textAlign: 'right' } }
											>
												{ __(
													'Action',
													'text-to-speech-player'
												) }
											</th>
										</tr>
									</thead>
									<tbody>
										{ aliases.map( ( alias ) => (
											<tr key={ alias.id }>
												<td
													style={ {
														fontWeight: 700,
														color: '#0f172a',
													} }
												>
													<code>{ alias.word }</code>
												</td>
												<td>{ alias.spoken }</td>
												<td>
													{ alias.numbers ? (
														<span className="tts-badge tts-badge-success">
															{ __(
																'Enabled',
																'text-to-speech-player'
															) }
														</span>
													) : (
														<span className="tts-badge tts-badge-secondary">
															{ __(
																'Disabled',
																'text-to-speech-player'
															) }
														</span>
													) }
												</td>
												<td>
													<Button
														variant="tertiary"
														onClick={ () =>
															speakPhrase(
																alias.spoken
															)
														}
													>
														🔊{ ' ' }
														{ __(
															'Listen',
															'text-to-speech-player'
														) }
													</Button>
												</td>
												<td
													style={ {
														textAlign: 'right',
													} }
												>
													<Button
														isDestructive
														variant="link"
														onClick={ () =>
															handleDeleteAlias(
																alias.id
															)
														}
													>
														{ __(
															'Delete',
															'text-to-speech-player'
														) }
													</Button>
												</td>
											</tr>
										) ) }
									</tbody>
								</table>
							) }
						</div>
					</div>
				) }

				{ /* 5. TAB: AI PROVIDERS (BYOK & CUSTOM) */ }
				{ activeTab === 'ai' && (
					<div>
						{ /* Header Card */ }
						<div className="tts-card">
							<div
								style={ {
									display: 'flex',
									alignItems: 'flex-start',
									justifyContent: 'space-between',
									flexWrap: 'wrap',
									gap: '16px',
								} }
							>
								<div>
									<h2 className="tts-card-title">
										{ __(
											'AI Neural Speech Engine (BYOK & Custom API)',
											'text-to-speech-player'
										) }
									</h2>
									<p className="tts-card-desc">
										{ __(
											'Connect top neural AI voice providers or self-hosted audio models for human-quality narration.',
											'text-to-speech-player'
										) }
									</p>
								</div>
								<div
									style={ {
										display: 'flex',
										alignItems: 'center',
										gap: '10px',
									} }
								>
									<span
										style={ {
											fontSize: '13px',
											fontWeight: 600,
											color: '#475569',
										} }
									>
										{ __(
											'Active Cloud Engine:',
											'text-to-speech-player'
										) }
									</span>
									<span
										className="tts-badge tts-badge-success"
										style={ {
											textTransform: 'capitalize',
										} }
									>
										{ settings.active_ai_provider ||
											'openai' }
									</span>
								</div>
							</div>

							{ /* Provider Selection Grid */ }
							<div className="tts-provider-grid">
								{ [
									{
										id: 'openai',
										name: 'OpenAI',
										sub: 'tts-1 & tts-1-hd Studio',
										icon: '🟢',
										bg: '#f0fdf4',
										configured: !! settings.openai_api_key,
									},
									{
										id: 'elevenlabs',
										name: 'ElevenLabs',
										sub: 'Prime Multilingual Voice',
										icon: '🟣',
										bg: '#faf5ff',
										configured:
											!! settings.elevenlabs_api_key,
									},
									{
										id: 'google',
										name: 'Google Cloud TTS',
										sub: 'Journey & Neural2',
										icon: '🔵',
										bg: '#eff6ff',
										configured:
											!! settings.google_tts_api_key,
									},
									{
										id: 'polly',
										name: 'Amazon Polly',
										sub: 'AWS Neural & Generative',
										icon: '🟠',
										bg: '#fff7ed',
										configured: !! (
											settings.polly_access_key &&
											settings.polly_secret_key
										),
									},
									{
										id: 'custom',
										name:
											settings.custom_ai_name ||
											'Custom AI',
										sub: 'OpenAI-Compatible / REST',
										icon: '⚡',
										bg: '#f0fdfa',
										configured:
											!! settings.custom_ai_endpoint,
									},
								].map( ( p ) => {
									const isCurrentTab = selectedAiTab === p.id;
									const isActiveProvider =
										( settings.active_ai_provider ||
											'openai' ) === p.id;
									return (
										<div
											key={ p.id }
											className={ `tts-provider-card ${
												isCurrentTab ? 'tts-active' : ''
											}` }
											onClick={ () =>
												setSelectedAiTab( p.id )
											}
										>
											<div className="tts-card-top">
												<div
													className="tts-provider-icon"
													style={ {
														background: p.bg,
													} }
												>
													{ p.icon }
												</div>
												<span
													className={ `tts-status-badge ${
														p.configured
															? 'configured'
															: 'unconfigured'
													}` }
												>
													{ p.configured
														? __(
																'Configured',
																'text-to-speech-player'
														  )
														: __(
																'Not Set',
																'text-to-speech-player'
														  ) }
												</span>
											</div>
											<h3 className="tts-provider-name">
												{ p.name }
											</h3>
											<p className="tts-provider-sub">
												{ p.sub }
											</p>
											{ isActiveProvider && (
												<div
													style={ {
														marginTop: '10px',
													} }
												>
													<span className="tts-status-badge active-tag">
														✓{ ' ' }
														{ __(
															'Default Engine',
															'text-to-speech-player'
														) }
													</span>
												</div>
											) }
										</div>
									);
								} ) }
							</div>

							{ /* Provider Activation Action */ }
							<div
								style={ {
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									padding: '12px 16px',
									background: '#f8fafc',
									borderRadius: '8px',
									border: '1px solid #e2e8f0',
									marginTop: '10px',
								} }
							>
								<div>
									<strong
										style={ {
											fontSize: '13px',
											color: '#0f172a',
										} }
									>
										{ __(
											'Current Selected Provider:',
											'text-to-speech-player'
										) }{ ' ' }
										<span
											style={ {
												textTransform: 'uppercase',
												color: '#1a73e8',
											} }
										>
											{ selectedAiTab }
										</span>
									</strong>
									<p
										style={ {
											margin: '2px 0 0',
											fontSize: '12px',
											color: '#64748b',
										} }
									>
										{ ( settings.active_ai_provider ||
											'openai' ) === selectedAiTab
											? __(
													'This provider is currently set as your primary Cloud AI speech engine.',
													'text-to-speech-player'
											  )
											: __(
													'Click the button on the right to set this provider as your primary Cloud AI engine.',
													'text-to-speech-player'
											  ) }
									</p>
								</div>
								<Button
									variant={
										( settings.active_ai_provider ||
											'openai' ) === selectedAiTab
											? 'tertiary'
											: 'secondary'
									}
									disabled={
										( settings.active_ai_provider ||
											'openai' ) === selectedAiTab
									}
									onClick={ () =>
										updateSetting(
											'active_ai_provider',
											selectedAiTab
										)
									}
								>
									{ ( settings.active_ai_provider ||
										'openai' ) === selectedAiTab
										? __(
												'✓ Default Engine',
												'text-to-speech-player'
										  )
										: __(
												'Set as Default Engine',
												'text-to-speech-player'
										  ) }
								</Button>
							</div>
						</div>

						{ /* Selected Provider Configuration Card */ }
						<div className="tts-card">
							{ /* 1. OPENAI CONFIG */ }
							{ selectedAiTab === 'openai' && (
								<div>
									<h2 className="tts-card-title">
										{ __(
											'OpenAI TTS Configuration',
											'text-to-speech-player'
										) }
									</h2>
									<p className="tts-card-desc">
										{ __(
											'Generate speech using OpenAI text-to-speech API (tts-1 and tts-1-hd).',
											'text-to-speech-player'
										) }
									</p>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'OpenAI API Key',
												'text-to-speech-player'
											) }
											type="password"
											value={
												settings.openai_api_key || ''
											}
											placeholder="sk-proj-..."
											onChange={ ( val ) =>
												updateSetting(
													'openai_api_key',
													val
												)
											}
											help={ __(
												'Your secret key is stored securely in the WordPress database and never exposed publicly.',
												'text-to-speech-player'
											) }
										/>
									</div>

									<div className="tts-form-row">
										<SelectControl
											label={ __(
												'OpenAI Model',
												'text-to-speech-player'
											) }
											value={
												settings.openai_model || 'tts-1'
											}
											options={ [
												{
													label: __(
														'tts-1 (Standard - Ultra-Low Latency & Fast)',
														'text-to-speech-player'
													),
													value: 'tts-1',
												},
												{
													label: __(
														'tts-1-hd (High Definition - Studio Broadcast Quality)',
														'text-to-speech-player'
													),
													value: 'tts-1-hd',
												},
											] }
											onChange={ ( val ) =>
												updateSetting(
													'openai_model',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<SelectControl
											label={ __(
												'OpenAI Voice Persona',
												'text-to-speech-player'
											) }
											value={
												settings.openai_voice || 'alloy'
											}
											options={ [
												{
													label: 'Alloy (Neutral, Balanced & Versatile)',
													value: 'alloy',
												},
												{
													label: 'Echo (Warm, Conversational & Engaging)',
													value: 'echo',
												},
												{
													label: 'Fable (Expressive British Storyteller)',
													value: 'fable',
												},
												{
													label: 'Nova (Energetic, Bright & Professional)',
													value: 'nova',
												},
												{
													label: 'Onyx (Deep, Authoritative & Narrative)',
													value: 'onyx',
												},
												{
													label: 'Shimmer (Crisp, High Resonance & Expressive)',
													value: 'shimmer',
												},
											] }
											onChange={ ( val ) =>
												updateSetting(
													'openai_voice',
													val
												)
											}
										/>
									</div>
								</div>
							) }

							{ /* 2. ELEVENLABS CONFIG */ }
							{ selectedAiTab === 'elevenlabs' && (
								<div>
									<h2 className="tts-card-title">
										{ __(
											'ElevenLabs Prime Voice AI Configuration',
											'text-to-speech-player'
										) }
									</h2>
									<p className="tts-card-desc">
										{ __(
											'Lifelike human speech with unmatched emotional range and accent fidelity.',
											'text-to-speech-player'
										) }
									</p>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'ElevenLabs API Key',
												'text-to-speech-player'
											) }
											type="password"
											value={
												settings.elevenlabs_api_key ||
												''
											}
											placeholder="xi-api-key-..."
											onChange={ ( val ) =>
												updateSetting(
													'elevenlabs_api_key',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<SelectControl
											label={ __(
												'ElevenLabs Model',
												'text-to-speech-player'
											) }
											value={
												settings.elevenlabs_model ||
												'eleven_multilingual_v2'
											}
											options={ [
												{
													label: 'Eleven Multilingual v2 (Highest Quality & Stability)',
													value: 'eleven_multilingual_v2',
												},
												{
													label: 'Eleven Turbo v2.5 (Fastest Real-Time Audio)',
													value: 'eleven_turbo_v2_5',
												},
												{
													label: 'Eleven English v1 (Classic Monolingual)',
													value: 'eleven_monolingual_v1',
												},
											] }
											onChange={ ( val ) =>
												updateSetting(
													'elevenlabs_model',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<SelectControl
											label={ __(
												'Preset Voice Persona',
												'text-to-speech-player'
											) }
											value={
												settings.elevenlabs_voice_id ||
												'21m00Tcm4TlvDq8ikWAM'
											}
											options={ [
												{
													label: 'Rachel (21m00Tcm4TlvDq8ikWAM - Calm & Professional)',
													value: '21m00Tcm4TlvDq8ikWAM',
												},
												{
													label: 'Domi (AZnzlk1XvdvUeBnXmlld - Strong & Empathetic)',
													value: 'AZnzlk1XvdvUeBnXmlld',
												},
												{
													label: 'Bella (EXAVITQu4vr4xnSDxMaL - Soft & Engaging)',
													value: 'EXAVITQu4vr4xnSDxMaL',
												},
												{
													label: 'Antoni (ErXwobaYiN019PkySvjV - Well-Rounded Classic)',
													value: 'ErXwobaYiN019PkySvjV',
												},
												{
													label: 'Josh (TxGEqnHWrfWFTfGW9XjX - Deep & Young)',
													value: 'TxGEqnHWrfWFTfGW9XjX',
												},
												{
													label: 'Adam (pNInz6obpgDQGcFmaJgB - Deep & Narrative)',
													value: 'pNInz6obpgDQGcFmaJgB',
												},
												{
													label: 'Custom Voice ID',
													value: 'custom',
												},
											] }
											onChange={ ( val ) =>
												updateSetting(
													'elevenlabs_voice_id',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'Custom Voice ID (Optional)',
												'text-to-speech-player'
											) }
											value={
												settings.elevenlabs_voice_id ||
												''
											}
											placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
											help={ __(
												'Enter any cloned or custom community voice ID from your ElevenLabs VoiceLab.',
												'text-to-speech-player'
											) }
											onChange={ ( val ) =>
												updateSetting(
													'elevenlabs_voice_id',
													val
												)
											}
										/>
									</div>
								</div>
							) }

							{ /* 3. GOOGLE CLOUD TTS CONFIG */ }
							{ selectedAiTab === 'google' && (
								<div>
									<h2 className="tts-card-title">
										{ __(
											'Google Cloud Text-to-Speech Configuration',
											'text-to-speech-player'
										) }
									</h2>
									<p className="tts-card-desc">
										{ __(
											'Synthesize natural-sounding speech with 220+ voices powered by Google DeepMind WaveNet & Journey models.',
											'text-to-speech-player'
										) }
									</p>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'Google Cloud API Key',
												'text-to-speech-player'
											) }
											type="password"
											value={
												settings.google_tts_api_key ||
												''
											}
											placeholder="AIzaSy..."
											onChange={ ( val ) =>
												updateSetting(
													'google_tts_api_key',
													val
												)
											}
											help={ __(
												'Obtained from Google Cloud Console under APIs & Services > Credentials.',
												'text-to-speech-player'
											) }
										/>
									</div>

									<div className="tts-form-row">
										<SelectControl
											label={ __(
												'Google Voice Model',
												'text-to-speech-player'
											) }
											value={
												settings.google_tts_voice ||
												'en-US-Journey-F'
											}
											options={ [
												{
													label: 'en-US-Journey-F (Conversational & Natural Female)',
													value: 'en-US-Journey-F',
												},
												{
													label: 'en-US-Journey-D (Expressive & Friendly Male)',
													value: 'en-US-Journey-D',
												},
												{
													label: 'en-US-Neural2-F (Studio Neural Quality Female)',
													value: 'en-US-Neural2-F',
												},
												{
													label: 'en-US-Neural2-C (Clear Deep Male)',
													value: 'en-US-Neural2-C',
												},
												{
													label: 'en-US-Wavenet-D (Classic Radio Broadcast Male)',
													value: 'en-US-Wavenet-D',
												},
												{
													label: 'en-US-Wavenet-F (Crisp Articulate Female)',
													value: 'en-US-Wavenet-F',
												},
											] }
											onChange={ ( val ) =>
												updateSetting(
													'google_tts_voice',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'Language Code',
												'text-to-speech-player'
											) }
											value={
												settings.google_tts_lang ||
												'en-US'
											}
											placeholder="en-US"
											onChange={ ( val ) =>
												updateSetting(
													'google_tts_lang',
													val
												)
											}
										/>
									</div>
								</div>
							) }

							{ /* 4. AMAZON POLLY CONFIG */ }
							{ selectedAiTab === 'polly' && (
								<div>
									<h2 className="tts-card-title">
										{ __(
											'Amazon Polly (AWS) Configuration',
											'text-to-speech-player'
										) }
									</h2>
									<p className="tts-card-desc">
										{ __(
											'Turn text into lifelike speech using Amazon Polly neural voices with high global availability.',
											'text-to-speech-player'
										) }
									</p>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'AWS Access Key ID',
												'text-to-speech-player'
											) }
											value={
												settings.polly_access_key || ''
											}
											placeholder="AKIA..."
											onChange={ ( val ) =>
												updateSetting(
													'polly_access_key',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'AWS Secret Access Key',
												'text-to-speech-player'
											) }
											type="password"
											value={
												settings.polly_secret_key || ''
											}
											placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
											onChange={ ( val ) =>
												updateSetting(
													'polly_secret_key',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<SelectControl
											label={ __(
												'AWS Region',
												'text-to-speech-player'
											) }
											value={
												settings.polly_region ||
												'us-east-1'
											}
											options={ [
												{
													label: 'US East (N. Virginia) - us-east-1',
													value: 'us-east-1',
												},
												{
													label: 'US West (Oregon) - us-west-2',
													value: 'us-west-2',
												},
												{
													label: 'Europe (Ireland) - eu-west-1',
													value: 'eu-west-1',
												},
												{
													label: 'Europe (Frankfurt) - eu-central-1',
													value: 'eu-central-1',
												},
												{
													label: 'Asia Pacific (Tokyo) - ap-northeast-1',
													value: 'ap-northeast-1',
												},
												{
													label: 'Asia Pacific (Sydney) - ap-southeast-2',
													value: 'ap-southeast-2',
												},
											] }
											onChange={ ( val ) =>
												updateSetting(
													'polly_region',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<SelectControl
											label={ __(
												'Polly Voice Persona',
												'text-to-speech-player'
											) }
											value={
												settings.polly_voice_id ||
												'Joanna'
											}
											options={ [
												{
													label: 'Joanna (US English - Neural Female)',
													value: 'Joanna',
												},
												{
													label: 'Matthew (US English - Neural Male)',
													value: 'Matthew',
												},
												{
													label: 'Amy (British English - Neural Female)',
													value: 'Amy',
												},
												{
													label: 'Brian (British English - Neural Male)',
													value: 'Brian',
												},
												{
													label: 'Danielle (US English - Generative Female)',
													value: 'Danielle',
												},
												{
													label: 'Gregory (US English - Generative Male)',
													value: 'Gregory',
												},
												{
													label: 'Kendra (US English - Clear Female)',
													value: 'Kendra',
												},
											] }
											onChange={ ( val ) =>
												updateSetting(
													'polly_voice_id',
													val
												)
											}
										/>
									</div>
								</div>
							) }

							{ /* 5. CUSTOM AI PROVIDER CONFIG */ }
							{ selectedAiTab === 'custom' && (
								<div>
									<h2 className="tts-card-title">
										{ __(
											'Custom AI Provider (OpenAI-Compatible & Self-Hosted)',
											'text-to-speech-player'
										) }
									</h2>
									<p className="tts-card-desc">
										{ __(
											'Connect any OpenAI-compatible API, Groq, Cartesia, Deepgram, LMNT, or self-hosted audio server (Kokoro, Piper, Coqui XTTS).',
											'text-to-speech-player'
										) }
									</p>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'Custom Provider Name',
												'text-to-speech-player'
											) }
											value={
												settings.custom_ai_name || ''
											}
											placeholder="e.g. Groq Audio / Local Piper / Self-Hosted Kokoro"
											onChange={ ( val ) =>
												updateSetting(
													'custom_ai_name',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'Custom Endpoint URL',
												'text-to-speech-player'
											) }
											value={
												settings.custom_ai_endpoint ||
												''
											}
											placeholder="https://api.groq.com/openai/v1/audio/speech or http://localhost:8000/v1/audio/speech"
											help={ __(
												'The full REST endpoint accepting POST requests for audio speech synthesis.',
												'text-to-speech-player'
											) }
											onChange={ ( val ) =>
												updateSetting(
													'custom_ai_endpoint',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'API Key / Bearer Token (Optional)',
												'text-to-speech-player'
											) }
											type="password"
											value={
												settings.custom_ai_api_key || ''
											}
											placeholder="Authorization token if required by endpoint"
											onChange={ ( val ) =>
												updateSetting(
													'custom_ai_api_key',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'Model Name / ID',
												'text-to-speech-player'
											) }
											value={
												settings.custom_ai_model ||
												'tts-1'
											}
											placeholder="e.g. tts-1, kokoro-v0_19, playht-large"
											onChange={ ( val ) =>
												updateSetting(
													'custom_ai_model',
													val
												)
											}
										/>
									</div>

									<div className="tts-form-row">
										<TextControl
											label={ __(
												'Voice Name / Persona',
												'text-to-speech-player'
											) }
											value={
												settings.custom_ai_voice ||
												'default'
											}
											placeholder="e.g. default, alloy, af_heart"
											onChange={ ( val ) =>
												updateSetting(
													'custom_ai_voice',
													val
												)
											}
										/>
									</div>
								</div>
							) }
						</div>

						{ /* Test Audio Synthesizer Playground Card */ }
						<div className="tts-card tts-synthesizer-box">
							<div
								style={ {
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									flexWrap: 'wrap',
									gap: '10px',
								} }
							>
								<div>
									<h2 className="tts-card-title">
										{ __(
											'AI Neural Synthesizer Playground',
											'text-to-speech-player'
										) }
									</h2>
									<p className="tts-card-desc">
										{ __(
											'Test synthetic speech generation with real-time audio playback and latency benchmarking.',
											'text-to-speech-player'
										) }
									</p>
								</div>
								<span className="tts-badge tts-badge-secondary">
									{ __(
										'Testing Target:',
										'text-to-speech-player'
									) }{ ' ' }
									<strong
										style={ {
											textTransform: 'uppercase',
											marginLeft: '4px',
										} }
									>
										{ selectedAiTab }
									</strong>
								</span>
							</div>

							{ /* Quick Prompts */ }
							<div className="tts-quick-prompts">
								<span
									style={ {
										fontSize: '12px',
										fontWeight: 600,
										color: '#64748b',
										alignSelf: 'center',
									} }
								>
									{ __(
										'Try Sample:',
										'text-to-speech-player'
									) }
								</span>
								<button
									type="button"
									className="tts-prompt-pill"
									onClick={ () =>
										setTestSpeechText(
											'Welcome to our website. Enjoy listening to this article with natural AI narration!'
										)
									}
								>
									{ __(
										'👋 Welcome Greeting',
										'text-to-speech-player'
									) }
								</button>
								<button
									type="button"
									className="tts-prompt-pill"
									onClick={ () =>
										setTestSpeechText(
											'Breaking update: The next generation audio speech synthesis engine is now live and fully operational.'
										)
									}
								>
									{ __(
										'📰 Breaking News',
										'text-to-speech-player'
									) }
								</button>
								<button
									type="button"
									className="tts-prompt-pill"
									onClick={ () =>
										setTestSpeechText(
											'Text to Speech Player dramatically improves reader retention, content accessibility, and SEO dwell time.'
										)
									}
								>
									{ __(
										'📈 SEO & Accessibility',
										'text-to-speech-player'
									) }
								</button>
							</div>

							<div className="tts-form-row">
								<textarea
									rows={ 3 }
									value={ testSpeechText }
									onChange={ ( e ) =>
										setTestSpeechText( e.target.value )
									}
									placeholder={ __(
										'Enter text to synthesize into high-fidelity neural audio...',
										'text-to-speech-player'
									) }
									style={ {
										width: '100%',
										padding: '12px',
										border: '1px solid #cbd5e1',
										borderRadius: '8px',
										fontSize: '13px',
										lineHeight: 1.5,
									} }
								/>
							</div>

							<div
								style={ {
									display: 'flex',
									alignItems: 'center',
									gap: '12px',
									marginTop: '14px',
									flexWrap: 'wrap',
								} }
							>
								<Button
									variant="primary"
									isBusy={ isSynthesizing }
									disabled={
										! testSpeechText.trim() ||
										isSynthesizing
									}
									onClick={ () =>
										handleSynthesizeAudio( selectedAiTab )
									}
								>
									{ isSynthesizing
										? __(
												'Synthesizing Neural Audio...',
												'text-to-speech-player'
										  )
										: `⚡ ${ __(
												'Synthesize via',
												'text-to-speech-player'
										  ) } ${ selectedAiTab.toUpperCase() }` }
								</Button>

								<Button
									variant="secondary"
									onClick={ () =>
										speakPhrase( testSpeechText )
									}
								>
									{ __(
										'🔊 Test via Browser Speech',
										'text-to-speech-player'
									) }
								</Button>
							</div>

							{ /* Synthesizer Error Banner */ }
							{ synthError && (
								<div
									style={ {
										marginTop: '16px',
										padding: '12px 16px',
										background: '#fef2f2',
										border: '1px solid #fecaca',
										borderRadius: '8px',
										color: '#991b1b',
										fontSize: '13px',
									} }
								>
									<strong>
										{ __(
											'Notice:',
											'text-to-speech-player'
										) }{ ' ' }
									</strong>
									{ synthError }
								</div>
							) }

							{ /* Synthesized Audio Player Result */ }
							{ synthesizedAudio && (
								<div className="tts-audio-player-result">
									<div className="tts-result-meta">
										<span>
											✓{ ' ' }
											<strong>
												{ __(
													'Synthesis Complete',
													'text-to-speech-player'
												) }
											</strong>{ ' ' }
											({ selectedAiTab.toUpperCase() })
										</span>
										{ synthLatency && (
											<span className="tts-badge tts-badge-success">
												⚡ { synthLatency } ms
											</span>
										) }
									</div>
									<audio
										controls
										autoPlay
										src={ synthesizedAudio }
									/>
								</div>
							) }
						</div>
					</div>
				) }

				{ /* 6. TAB: ANALYTICS */ }
				{ activeTab === 'analytics' && (
					<div>
						{ loadingAnalytics ? (
							<div
								style={ {
									textAlign: 'center',
									padding: '60px',
								} }
							>
								<Spinner />
								<p
									style={ {
										color: '#64748b',
										marginTop: '12px',
									} }
								>
									{ __(
										'Loading playback analytics...',
										'text-to-speech-player'
									) }
								</p>
							</div>
						) : (
							<div>
								{ /* Stat Metric Boxes */ }
								<div className="tts-stats-grid">
									<div className="tts-stat-card">
										<span className="tts-stat-label">
											{ __(
												'Total Listens',
												'text-to-speech-player'
											) }
										</span>
										<span className="tts-stat-value">
											{ analyticsData?.totalPlays || 0 }
										</span>
										<span className="tts-stat-sub">
											{ __(
												'Player activations across all posts',
												'text-to-speech-player'
											) }
										</span>
									</div>
									<div className="tts-stat-card">
										<span className="tts-stat-label">
											{ __(
												'Estimated Audio Served',
												'text-to-speech-player'
											) }
										</span>
										<span className="tts-stat-value">
											{ analyticsData?.totalListenMin ||
												0 }{ ' ' }
											<small
												style={ {
													fontSize: '14px',
													fontWeight: 500,
												} }
											>
												min
											</small>
										</span>
										<span className="tts-stat-sub">
											{ __(
												'Total visitor engagement time',
												'text-to-speech-player'
											) }
										</span>
									</div>
									<div className="tts-stat-card">
										<span className="tts-stat-label">
											{ __(
												'Average Completion Rate',
												'text-to-speech-player'
											) }
										</span>
										<span className="tts-stat-value">
											{ analyticsData?.completionRate ||
												0 }
											%
										</span>
										<span className="tts-stat-sub">
											{ __(
												'Estimated article listen completion',
												'text-to-speech-player'
											) }
										</span>
									</div>
								</div>

								{ /* Top Spoken Posts Table */ }
								<div className="tts-card">
									<h2 className="tts-card-title">
										{ __(
											'Top Spoken Posts & Articles',
											'text-to-speech-player'
										) }
									</h2>
									<p className="tts-card-desc">
										{ __(
											'Articles and pages with the highest audio listener activity.',
											'text-to-speech-player'
										) }
									</p>

									{ ! analyticsData?.topPosts ||
									analyticsData.topPosts.length === 0 ? (
										<div
											style={ {
												padding: '40px 20px',
												textAlign: 'center',
												color: '#64748b',
												background: '#f8fafc',
												borderRadius: '8px',
											} }
										>
											<p
												style={ {
													fontSize: '14px',
													margin: 0,
												} }
											>
												{ __(
													'No audio play events recorded yet. Once visitors click "Listen" on your articles, statistics will appear here.',
													'text-to-speech-player'
												) }
											</p>
										</div>
									) : (
										<table className="tts-data-table">
											<thead>
												<tr>
													<th>
														{ __(
															'Post Title',
															'text-to-speech-player'
														) }
													</th>
													<th>
														{ __(
															'Published Date',
															'text-to-speech-player'
														) }
													</th>
													<th>
														{ __(
															'Listens',
															'text-to-speech-player'
														) }
													</th>
													<th
														style={ {
															textAlign: 'right',
														} }
													>
														{ __(
															'Actions',
															'text-to-speech-player'
														) }
													</th>
												</tr>
											</thead>
											<tbody>
												{ analyticsData.topPosts.map(
													( post ) => (
														<tr key={ post.id }>
															<td
																style={ {
																	fontWeight: 600,
																} }
															>
																<a
																	href={
																		post.url
																	}
																	target="_blank"
																	rel="noopener noreferrer"
																	style={ {
																		color: '#1a73e8',
																		textDecoration:
																			'none',
																	} }
																>
																	{
																		post.title
																	}{ ' ' }
																	↗
																</a>
															</td>
															<td>
																{ post.date }
															</td>
															<td>
																<span className="tts-badge tts-badge-success">
																	{
																		post.playCount
																	}{ ' ' }
																	{ __(
																		'plays',
																		'text-to-speech-player'
																	) }
																</span>
															</td>
															<td
																style={ {
																	textAlign:
																		'right',
																} }
															>
																<a
																	href={
																		post.editUrl
																	}
																	className="button button-small"
																>
																	{ __(
																		'Edit Post',
																		'text-to-speech-player'
																	) }
																</a>
															</td>
														</tr>
													)
												) }
											</tbody>
										</table>
									) }
								</div>
							</div>
						) }
					</div>
				) }

				{ /* 7. TAB: SYSTEM STATUS */ }
				{ activeTab === 'status' && (
					<div className="tts-card">
						<h2 className="tts-card-title">
							{ __(
								'System & Compatibility Status',
								'text-to-speech-player'
							) }
						</h2>
						<p className="tts-card-desc">
							{ __(
								'Health check of your server environment and browser capabilities.',
								'text-to-speech-player'
							) }
						</p>

						<table
							style={ {
								width: '100%',
								textAlign: 'left',
								borderCollapse: 'collapse',
							} }
						>
							<tbody>
								<tr
									style={ {
										borderBottom: '1px solid #f1f5f9',
									} }
								>
									<td
										style={ {
											padding: '12px 0',
											fontWeight: '600',
										} }
									>
										{ __(
											'Browser SpeechSynthesis API:',
											'text-to-speech-player'
										) }
									</td>
									<td
										style={ {
											padding: '12px 0',
											color:
												typeof window !== 'undefined' &&
												'speechSynthesis' in window
													? '#137333'
													: '#d93025',
										} }
									>
										{ typeof window !== 'undefined' &&
										'speechSynthesis' in window ? (
											<span className="tts-badge tts-badge-success">
												✓{ ' ' }
												{ __(
													'Supported (',
													'text-to-speech-player'
												) }{ ' ' }
												{ availableVoices.length }{ ' ' }
												{ __(
													'system voices detected)',
													'text-to-speech-player'
												) }
											</span>
										) : (
											<span
												className="tts-badge"
												style={ {
													background: '#fde8e8',
													color: '#9b1c1c',
												} }
											>
												✕{ ' ' }
												{ __(
													'Not supported in this browser',
													'text-to-speech-player'
												) }
											</span>
										) }
									</td>
								</tr>
								<tr
									style={ {
										borderBottom: '1px solid #f1f5f9',
									} }
								>
									<td
										style={ {
											padding: '12px 0',
											fontWeight: '600',
										} }
									>
										{ __(
											'PHP Version:',
											'text-to-speech-player'
										) }
									</td>
									<td style={ { padding: '12px 0' } }>
										{ initialData.environment?.phpVersion ||
											'Unknown' }
									</td>
								</tr>
								<tr
									style={ {
										borderBottom: '1px solid #f1f5f9',
									} }
								>
									<td
										style={ {
											padding: '12px 0',
											fontWeight: '600',
										} }
									>
										{ __(
											'WordPress Version:',
											'text-to-speech-player'
										) }
									</td>
									<td style={ { padding: '12px 0' } }>
										{ initialData.environment?.wpVersion ||
											'Unknown' }
									</td>
								</tr>
								<tr
									style={ {
										borderBottom: '1px solid #f1f5f9',
									} }
								>
									<td
										style={ {
											padding: '12px 0',
											fontWeight: '600',
										} }
									>
										{ __(
											'OpenSSL Extension:',
											'text-to-speech-player'
										) }
									</td>
									<td style={ { padding: '12px 0' } }>
										{ initialData.environment?.openssl ? (
											<span className="tts-badge tts-badge-success">
												✓{ ' ' }
												{ __(
													'Enabled',
													'text-to-speech-player'
												) }
											</span>
										) : (
											<span
												className="tts-badge"
												style={ {
													background: '#fde8e8',
													color: '#9b1c1c',
												} }
											>
												✕{ ' ' }
												{ __(
													'Disabled',
													'text-to-speech-player'
												) }
											</span>
										) }
									</td>
								</tr>
								<tr
									style={ {
										borderBottom: '1px solid #f1f5f9',
									} }
								>
									<td
										style={ {
											padding: '12px 0',
											fontWeight: '600',
										} }
									>
										{ __(
											'Memory Limit:',
											'text-to-speech-player'
										) }
									</td>
									<td style={ { padding: '12px 0' } }>
										{ initialData.environment
											?.memoryLimit || 'N/A' }
									</td>
								</tr>
								<tr
									style={ {
										borderBottom: '1px solid #f1f5f9',
									} }
								>
									<td
										style={ {
											padding: '12px 0',
											fontWeight: '600',
										} }
									>
										{ __(
											'Max Execution Time:',
											'text-to-speech-player'
										) }
									</td>
									<td style={ { padding: '12px 0' } }>
										{ initialData.environment
											?.maxExecutionTime || 'N/A' }
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				) }

				{ /* 8. TAB: TOOLS & BACKUP */ }
				{ activeTab === 'tools' && (
					<div className="tts-card">
						<h2 className="tts-card-title">
							{ __(
								'Settings Backup, Migration & Tools',
								'text-to-speech-player'
							) }
						</h2>
						<p className="tts-card-desc">
							{ __(
								'Export configurations to JSON for easy staging-to-production migration, import backups, or reset settings.',
								'text-to-speech-player'
							) }
						</p>

						<div
							style={ {
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: '24px',
								marginTop: '20px',
							} }
						>
							{ /* Export Settings */ }
							<div
								style={ {
									padding: '20px',
									background: '#f8fafc',
									borderRadius: '10px',
									border: '1px solid #e2e8f0',
								} }
							>
								<h3
									style={ {
										margin: '0 0 8px 0',
										fontSize: '15px',
										fontWeight: 600,
										color: '#1e293b',
									} }
								>
									📥{ ' ' }
									{ __(
										'Export Settings Backup',
										'text-to-speech-player'
									) }
								</h3>
								<p
									style={ {
										fontSize: '13px',
										color: '#64748b',
										margin: '0 0 16px 0',
										lineHeight: 1.5,
									} }
								>
									{ __(
										'Download a complete JSON file containing all player appearance presets, audio filtering rules, and AI configurations.',
										'text-to-speech-player'
									) }
								</p>
								<Button
									variant="primary"
									onClick={ handleExportSettings }
								>
									{ __(
										'Export Settings (JSON)',
										'text-to-speech-player'
									) }
								</Button>
							</div>

							{ /* Import Settings */ }
							<div
								style={ {
									padding: '20px',
									background: '#f8fafc',
									borderRadius: '10px',
									border: '1px solid #e2e8f0',
								} }
							>
								<h3
									style={ {
										margin: '0 0 8px 0',
										fontSize: '15px',
										fontWeight: 600,
										color: '#1e293b',
									} }
								>
									📤{ ' ' }
									{ __(
										'Import Settings Backup',
										'text-to-speech-player'
									) }
								</h3>
								<p
									style={ {
										fontSize: '13px',
										color: '#64748b',
										margin: '0 0 16px 0',
										lineHeight: 1.5,
									} }
								>
									{ __(
										'Upload a previously saved .json settings file to restore your configuration on this site.',
										'text-to-speech-player'
									) }
								</p>
								<label
									className="button"
									style={ {
										display: 'inline-block',
										cursor: 'pointer',
									} }
								>
									{ __(
										'Select JSON File to Import',
										'text-to-speech-player'
									) }
									<input
										type="file"
										accept=".json"
										style={ { display: 'none' } }
										onChange={ handleImportSettings }
									/>
								</label>
							</div>
						</div>

						{ /* Factory Reset */ }
						<div
							style={ {
								marginTop: '30px',
								background: '#fff5f5',
								padding: '20px',
								borderRadius: '10px',
								border: '1px solid #fecaca',
							} }
						>
							<h3
								style={ {
									margin: '0 0 8px 0',
									fontSize: '15px',
									fontWeight: 600,
									color: '#991b1b',
								} }
							>
								⚠️{ ' ' }
								{ __(
									'Danger Zone: Factory Reset',
									'text-to-speech-player'
								) }
							</h3>
							<p
								style={ {
									fontSize: '13px',
									color: '#7f1d1d',
									margin: '0 0 16px 0',
									lineHeight: 1.5,
								} }
							>
								{ __(
									'Reset all Text to Speech Player settings back to clean initial factory defaults. Custom styling and filtering rules will be restored to original settings.',
									'text-to-speech-player'
								) }
							</p>
							<Button
								isDestructive
								variant="primary"
								onClick={ handleResetSettings }
							>
								{ __(
									'Reset All Settings to Factory Defaults',
									'text-to-speech-player'
								) }
							</Button>
						</div>
					</div>
				) }
			</div>
		</div>
	);
};

// Mount to DOM
document.addEventListener( 'DOMContentLoaded', () => {
	const root = document.getElementById( 'tts-player-admin-root' );
	if ( root ) {
		render( <AdminApp />, root );
	}
} );
