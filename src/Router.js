import * as React from 'react';

// Router stuff
import { BrowserRouter as Router, Route, Switch, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Utils from "./components/Utils.js";

// Routes
import Home from './Home.js';

class TeleportRouter extends React.Component {

	componentDidMount() {
		// set bg color
		document.documentElement.classList.add(`bg-black`);
		document.body.classList.add(`bg-black`);
	}

	render() {
		return (
			<Router>
				<div id="Router">
					<Switch>
						<Route exact path="/" children={Home} />
					</Switch>
				</div>

			</Router>
		)
	}
}

export default TeleportRouter;