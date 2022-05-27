// https://2pha.com/demos/threejs/shaders/2_color_fresnel.html
// https://necromanthus.com/Test/html5/Lara_shader.html
// https://github.com/mrdoob/three.js/issues/4800
import * as THREE from 'three';
// import checkMap from "../res/tex/check.png"

const vertex =
`
    varying vec2 vUv; // this is needed for texture in frag

	uniform float fresnelBias;
	uniform float fresnelScale;
	uniform float fresnelPower;

	varying float vReflectionFactor;

	#ifdef USE_SKINNING
		uniform mat4 bindMatrix;
		uniform mat4 bindMatrixInverse;
		#ifdef BONE_TEXTURE
			uniform sampler2D boneTexture;
			uniform int boneTextureSize;
			mat4 getBoneMatrix( const in float i ) {
				float j = i * 4.0;
				float x = mod( j, float( boneTextureSize ) );
				float y = floor( j / float( boneTextureSize ) );
				float dx = 1.0 / float( boneTextureSize );
				float dy = 1.0 / float( boneTextureSize );
				y = dy * ( y + 0.5 );
				vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
				vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
				vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
				vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );
				mat4 bone = mat4( v1, v2, v3, v4 );
				return bone;
			}
		#else
			uniform mat4 boneMatrices[ MAX_BONES ];
			mat4 getBoneMatrix( const in float i ) {
				mat4 bone = boneMatrices[ int(i) ];
				return bone;
			}
		#endif
	#endif

    void main() {
        vUv = uv; // needed for texture

		#ifdef USE_SKINNING
			mat4 boneMatX = getBoneMatrix( skinIndex.x );
			mat4 boneMatY = getBoneMatrix( skinIndex.y );
			mat4 boneMatZ = getBoneMatrix( skinIndex.z );
			mat4 boneMatW = getBoneMatrix( skinIndex.w );
			mat4 skinMatrix = mat4( 0.0 );
			skinMatrix += skinWeight.x * boneMatX;
			skinMatrix += skinWeight.y * boneMatY;
			skinMatrix += skinWeight.z * boneMatZ;
			skinMatrix += skinWeight.w * boneMatW;
			skinMatrix  = bindMatrixInverse * skinMatrix * bindMatrix;
			vec4 skinVertex = bindMatrix * vec4( position, 1.0 );
			vec4 skinned = vec4( 0.0 );
			skinned += boneMatX * skinVertex * skinWeight.x;
			skinned += boneMatY * skinVertex * skinWeight.y;
			skinned += boneMatZ * skinVertex * skinWeight.z;
			skinned += boneMatW * skinVertex * skinWeight.w;
			skinned  = bindMatrixInverse * skinned;
			vec4 mvPosition = modelViewMatrix * skinned;
		#else
			vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		#endif

		vec4 worldPosition = modelMatrix * vec4( position, 1.0 );

		vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );

		vec3 I = worldPosition.xyz - cameraPosition;

		vReflectionFactor = fresnelBias + fresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), fresnelPower );

		gl_Position = projectionMatrix * mvPosition;
    }
`

let fragment =
`
	varying vec2 vUv; // uvs for bodyTex
	uniform sampler2D map;

	uniform vec3 color1;
	uniform vec3 color2;

	varying float vReflectionFactor;

	void main() {
	    vec3 col = mix(color2, color1, vec3(clamp( vReflectionFactor, 0.0, 1.0 )));
		vec3 bodyTex = texture2D( map, vUv ).rgb; // grabs texture but as rgb i assume

	    col *= (bodyTex.r + bodyTex.g + bodyTex.b) / 3.0; // adds texture to col

		gl_FragColor = vec4(col, 1.0);
	}
`

class Shader extends THREE.ShaderMaterial {
	constructor(props) {
		super()

		this.color1 = props.color1
		this.color2 = props.color2
		this.bias = props.bias
		this.scale = props.scale
		this.power = props.power

		this.vertexShader = vertex
		this.fragmentShader = fragment

		this.map = props.map
		// this.map = props.map || new THREE.TextureLoader().load(checkMap)

		this.uniforms = {
		    map: {
		    	type: 't',
		    	value: this.map
		    },
			color1: {
			  type: "c",
			  value: this.color1,
			},
			color2: {
			  type: "c",
			  value: this.color2,
			},
			fresnelBias: {
			  type: "f",
			  value: this.bias ? this.bias : 0.1,
			  min: 0.0, // only used for dat.gui, not needed for production
			  max: 1.0 // only used for dat.gui, not needed for production
			},
			fresnelScale: {
			  type: "f",
			  value: this.scale ? this.scale : 2.0,
			  min: 0.0, // only used for dat.gui, not needed for production
			  max: 10.0 // only used for dat.gui, not needed for production
			},
			fresnelPower: {
			  type: 'f',
			  value: this.power ? this.power : 2.0,
			  min: 0.0, // only used for dat.gui, not needed for production
			  max: 10.0 // only used for dat.gui, not needed for production
			}
		}

		this.skinning = true
	}
}

export default Shader;
