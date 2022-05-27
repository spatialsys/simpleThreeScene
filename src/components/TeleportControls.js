import * as THREE from 'three';

import Utils from './Utils.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import { DragControls } from "./res/examples/jsm/controls/DragControls.js";
import TWEEN from '@tweenjs/tween.js'

class TeleportControls extends OrbitControls {
	constructor(object, domElement) {
		super(object, domElement);

		// orbit controls defaults, will make it impossible to change these, should pass in object.* || true

		// enable up and down and right and left
		this.enableKeys = true;
		this.keys = {
			LEFT: 'KeyA', //left arrow
			UP: 'KeyW', // up arrow
			RIGHT: 'KeyD', // right arrow
			BOTTOM: 'KeyS' // down arrow
		}

		this.keyPanSpeed = 64
		// console.log("this", this.keyPanSpeed)

		// this.autoRotate = false;
		this.autoRotateSpeed = 2;
		this.zoomSpeed = 1;

		// this.enableRotate = false;

		this.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
		this.dampingFactor = 0.1;

		// with floor or scene
		this.screenSpacePanning = false;

		this.minDistance = 0;
		this.maxDistance = 30000;

		this.maxPolarAngle = Math.PI / 1.9;
		this.wheeling = false

		// domElement.addEventListener('scroll', (event) => {
		// 	console.log('gesturestart', event)
		// })

		// hack smooth zoom by modulating zoomspeed help from: http://jsfiddle.net/y62d4qnr/
		domElement.addEventListener('wheel', (event) => {
			// constrain speed by a factor based on minDistance and maxDistance
			// const speedFactor = Utils.mapRange(this.distance(), this.minDistance, 600, .5, 1.25);

			const margin = 20000

			let maxSpeed
			let speedFactor
			const bound = this.maxDistance - margin

			if (this.distance() > bound) {
				maxSpeed = 2.5
				speedFactor = Utils.modulate(this.distance(), [bound, this.maxDistance], [1000, 10000])
			} else {
				maxSpeed = 2.5
				speedFactor = Utils.modulate(this.distance(), [this.minDistance, this.maxDistance], [60, 1000])
			}



			// const closeSpeedFactor = Utils.modulate(this.distance(), [this.minDistance, this.minDistance + 800], [1, maxSpeed]);
			// const farSpeedFactor = Utils.modulate(this.distance(), [this.maxDistance, this.maxDistance - 1600], [.1, maxSpeed])
			// const speedFactor = Math.min(closeSpeedFactor, farSpeedFactor)

			// console.log("wheel event", this.distance(), bound, this.distance() > bound)

			if (event.wheelDelta) {
				// console.log("wheel event", event.wheelDelta)
				const delta = Math.min(Math.abs(event.wheelDelta) / speedFactor, maxSpeed);
				this.zoomSpeed = delta
			}


			// beyond bounds
			if (this.distance() > bound) {
				// todo: if you wheel then leave the window, i shoudl handle that with settimeout
				// this.zoomSpeed = Utils.modulate(this.distance(), [bound, this.maxDistance], [.05, 0])
				// console.log("beyond bounds", event.wheelDelta)

				if (Math.abs(event.wheelDelta) === 6) {
					// event.preventDefault()
					const normal = new THREE.Vector3()
					normal.subVectors(object.position, this.target).normalize()
					const boundedCameraPosition = normal.clone().multiplyScalar(bound*.8).add(this.target)

					// cancel if it's still tweening
					if (object.tween && object.tween.isPlaying()) {
						object.tween.stop()
						TWEEN.remove(object.tween)
					}

					// bounce back
					// console.log("animate back to bounds", bound/this.maxDistance)
					const tween = new TWEEN.Tween(object.position)
						.to(boundedCameraPosition, 600)
						.easing(TWEEN.Easing.Quintic.Out)
						.start()
						.onComplete( () => {
							object.tween = null
						})
					object.tween = tween
				}
			}

		})


		// key controls and listeners
		if (this.enableKeys) {
			this.listenToKeyEvents(window);
		} else {
			window.removeEventListener( 'keydown', onKeyDown );	
		}



		// domElement.addEventListener( 'mousedown', (event) => {
		// 	console.log("mousedown", event)
		// })

		// domElement.addEventListener( 'mousedown', onMouseDown.bind(this), false );

		// function onMouseDown(event) {
		// 	console.log("mousedown again", event)

		// 	event.preventDefault();

		// 	// startPosition.x = event.clientX;
		// 	// startPosition.y = event.clientY;

		// 	// pan = move, rotate = pan around
		// 	this.mouseButtons.LEFT = THREE.MOUSE.PAN;
		// 	this.state = 2;
		// 	this.update();

		// 	domElement.addEventListener( 'mousemove', bindedMouseMove, false );
		// 	domElement.addEventListener( 'mouseup', onMouseUp.bind(this), false );
		// }


		// start device orientation controls
		this.object.rotation.reorder( 'YXZ' );
		this.enabledOrientation = false;

		this.deviceOrientation = {};
		this.screenOrientation = 0;
		this.alphaOffset = 0; // radians


		this.distance = () => {
			return this.object.position.distanceTo( this.target );
		}

		this.relativeDistance = () => {
			return Utils.mapRange(this.distance(), this.minDistance, this.maxDistance, 0, 1)
		}

		this.onDeviceOrientationChangeEvent = ( event ) => {
			this.deviceOrientation = event;
			// console.log("device orientation", this.deviceOrientation, event)
		};

		this.onScreenOrientationChangeEvent = () => {
			this.screenOrientation = window.orientation || 0;
			// console.log("screen orientation", this.screenOrientation)
		};

		// The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

		this.setObjectQuaternion = (quaternion, alpha, beta, gamma, orient) => {
			// console.log("set object")
			var zee = new THREE.Vector3( 0, 0, 1 );
			var euler = new THREE.Euler();
			var q0 = new THREE.Quaternion();
			var q1 = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

			euler.set( beta, alpha + Math.PI, -gamma, 'YXZ' ); // 'ZXY' for the device, but 'YXZ' for us. adding Math.pi to flip 180
			quaternion.setFromEuler( euler ); // orient the device
			quaternion.multiply( q1 ); // camera looks out the back of the device, not the top
			quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) ); // adjust for screen orientation
		};

		// tilt
		this.connectTiltOrientation = () => {
			// console.log('tilt')
			// // https://jsfiddle.net/EthanHermsey/e3b501cw/51/
			// // https://stackoverflow.com/questions/60678494/orbit-controls-follow-the-mouse-without-clicking-three-js

			this.minPolarAngle = 0;
			this.maxPolarAngle = Math.PI * 2;
			this.enabledOrientation = true;

			if ( window.DeviceOrientationEvent !== undefined && typeof window.DeviceOrientationEvent.requestPermission === 'function' ) {
				window.DeviceOrientationEvent.requestPermission().then( (response) => {
					// window.alert('device response', response);
					console.log('device perm', response)
					if (response === 'granted') {
						window.addEventListener( 'orientationchange', this.onScreenOrientationChange, false );
						window.addEventListener( 'deviceorientation', this.onOrientationChange, false );
					}
				}).catch( (error) => {
					console.error( 'THREE.DeviceOrientationControls: Unable to use DeviceOrientation API:', error );
				});
			} else {
				console.log("iono")
			}

			// debug with mouse
			// document.addEventListener('mousemove', (event) => {
			// 	const targetHeight = 140
			// 	const targetDistance = 200
			// 	let yRotationFactor = event.offsetX / window.innerWidth
			// 	let xRotationFactor = event.offsetY / window.innerHeight

			// 	object.position.x = Utils.modulate(yRotationFactor, [0,1], [-240, 240])
			// 	object.position.y = targetHeight + Utils.modulate(xRotationFactor, [0,1], [240, -240])
			// 	object.position.z = targetDistance + (Math.abs(Utils.modulate(yRotationFactor, [0,1], [96, -96])))
			// })
		}


		this.disconnectTiltOrientation = () => {
			window.removeEventListener( 'orientationchange', this.onScreenOrientationChange, false );
			window.removeEventListener( 'deviceorientation', this.onOrientationChange, false );

			this.enabledOrientation = false;
		};

		// this.onDeviceOrientationChangeEvent
		this.onScreenOrientationChange = () => {
			// console.log("screen orientation event", window.orientation || 0);
			// console.log("screen orientation", this.screenOrientation)
		};

		this.onOrientationChange = (event) => {
			// console.log("orientation event", event)
			const targetHeight = 180
			const targetDistance = 200

			// alpha: zRotation(0, 360), beta: xRotation (-180, 180), gamma: yRotation(-90, 90)
			let yRotationFactor = Utils.modulate(event.gamma, [-90, 90], [0, 1])
			let xRotationFactor = Utils.modulate(event.beta, [0, 90], [0, 1])
			// console.log(xRotationFactor, event.beta)
			console.log(yRotationFactor, event.gamma)

			object.position.x = Utils.modulate(yRotationFactor, [0,1], [-500, 500])
			object.position.y = targetHeight + Utils.modulate(xRotationFactor, [0,1], [240, -240])
			object.position.z = targetDistance + (Math.abs(Utils.modulate(yRotationFactor, [0,1], [128, -128])))
		};




		this.connectOrientation = () => {
			this.onScreenOrientationChangeEvent(); // run once on load

			// iOS 13+
			if ( window.DeviceOrientationEvent !== undefined && typeof window.DeviceOrientationEvent.requestPermission === 'function' ) {
				window.DeviceOrientationEvent.requestPermission().then( (response) => {
					// window.alert('device response', response);
					if (response === 'granted') {
						window.addEventListener( 'orientationchange', this.onScreenOrientationChangeEvent, false );
						window.addEventListener( 'deviceorientation', this.onDeviceOrientationChangeEvent, false );
					}
				}).catch( (error) => {
					console.error( 'THREE.DeviceOrientationControls: Unable to use DeviceOrientation API:', error );
				});
			} else {
				window.addEventListener( 'orientationchange', this.onScreenOrientationChangeEvent, false );
				window.addEventListener( "deviceorientation", this.onDeviceOrientationChangeEvent, false );
			}
			this.enabledOrientation = true;
			// this.enableRotate = false;

			// this.enabled = false;
		};

		this.disconnectOrientation = () => {
			window.removeEventListener( 'orientationchange', this.onScreenOrientationChangeEvent, false );
			window.removeEventListener( 'deviceorientation', this.onDeviceOrientationChangeEvent, false );

			this.enabledOrientation = false;
			// this.enableRotate = true;

			// this.enabled = true;
		};

		this.updateOrientation = function() {
			// console.log("enabled or not", this.enabledOrientation)
			if ( this.enabledOrientation === false ) return;

			var device = this.deviceOrientation;

			if ( device ) {
				var alpha = device.alpha ? THREE.MathUtils.degToRad( device.alpha ) + this.alphaOffset : 0; // Z
				var beta = device.beta ? THREE.MathUtils.degToRad( device.beta ) : 0; // X'
				var gamma = device.gamma ? THREE.MathUtils.degToRad( device.gamma ) : 0; // Y''
				var orient = this.screenOrientation ? THREE.MathUtils.degToRad( this.screenOrientation ) : 0; // O

				this.setObjectQuaternion( this.object.quaternion, alpha, beta, gamma, orient );
			}
		};

		this.disposeOrientation = () => {
			this.disconnectOrientation();
		};


		// stop autorotate after the first interaction
		// todo: this will probably restart everytime which i
		// should store an initialized state of autorotate
		let autorotateTimeout
		let initAutoRotateValue
		this.addEventListener('start', () => {
			// set init autorotate value
			if (!initAutoRotateValue) {
				initAutoRotateValue = this.autoRotate
			}
			// console.log("stop auto rotate")
			clearTimeout(autorotateTimeout);
			this.autoRotate = false;
		});

		// restart autorotate after the last interaction & an idle time has passed
		this.addEventListener('end', () => {
			autorotateTimeout = setTimeout(() => {
				// console.log("restart auto rotate")
				if (initAutoRotateValue) {
					this.autoRotate = true;
				}
			}, 3000);
		});
	}
}

export default TeleportControls;
