import * as React from 'react';
import { withRouter } from "react-router-dom";

import Utils from "./components/Utils.js";
import Scene from './components/Scene.js';
import Splash from './res/summerhouse.glb'

class Home extends React.Component {
	constructor() {
		super();

		this.state = {
		}

		this.bgColor = Utils.isNight() ? "bg-black" : null;
	}

	componentDidMount() {

	}

	componentWillUnmount() {
	}

	render() {
		return (

			<div
				className={`flex items-center justify-center flex-column ${Utils.isNight() ? "bg-night" : null }`}
				style={{
					height: "100vh"
				}}
			>
				<div
					className="full-viewport absolute"
				>
					<Scene
						match={this.props.match}
						ref="scene"
						autoRotate={true}
						bg={Splash}
					/>
				</div>


				<div className="flex flex-column scaleIn">

					<button
						className="scaleIn pill-button z2 mb4"
						// onClick={}
					>
						Button
					</button>
				</div>

			</div>

		)
	}
}
export default withRouter(Home);
