/*==================================================
App Name: Weather Checker 
URL: https://dcjwest.github.io/weather-app
Description: A simple app to check weather forecasts
Developer: David van der Westhuizen
Copyright (c) 2019 David van der Westhuizen
===================================================*/

$(function(){
	/*****************\
	 Cache DOM Elements
	\*****************/

	// Main app, loading, and error screens
	const app = $("#app");
	const loadScreen = $("#loader");
	const errorPage = $('#error-page').slideUp(); // Hide error screen

	// Current location and weather info
	const location = $("#location");
	const currentTemp = $("#current-temp");
	const currentMaxTemp = $("#current-max");
	const currentMinTemp = $("#current-min");
	const tempUnit = $("#temp-unit");
	const tempSummary = $("#current-summary");
	const updateCounter = $("#update-counter");
	let lastFetchTime;

	// Hourly weather info
	const hours = [...$("#hours div")];
	const hourlyIcons = [...$("#hourly-icons img")];
	const hourlyTemps = [...$("#hourly-temps span")];

	// Daily weather info
	const forecastDays = [...$(".forecast-day")];

	// Miscellaneous weather info
	const humidityBar = $("#humidity");
	const feelsLike = $("#feels-like");
	const uvIndexVal = $("#uv-index");
	const windDirection = $("#wind-direct");
	const windVelocity = $("#wind-speed");

	// Check if user enables geolocation in the browser and launch app if yes
	if (navigator.geolocation){
		navigator.geolocation.getCurrentPosition(position => {

			// Initialise latitude and longitude variables and use them to retrieve data from APIs
			let lat = position.coords.latitude;
			let long = position.coords.longitude;
			
			getLocation(lat, long);
			getWeatherData(lat, long);

			app.show(500);
			errorPage.hide();
			loadScreen.fadeOut(300);

		}, (err) => handleError(err));
	}

	// Hide weather app and display error screen with error message logged in the console
	const handleError = (err) => {
		console.log(err);
		errorPage.css("opacity", 1).slideDown(1000);
		app.hide();
		loadScreen.hide();
	}

	// Call LocationIQ API and process response to JSON format
	const getLocation = (latitude, longitude) => {
		const locAPI = `https://us1.locationiq.com/v1/reverse.php?key=56552b4b1c4b9a&lat=${latitude}&lon=${longitude}&format=json`;
		
		fetch(locAPI)
			.then((response) => {
				return response.json();
			})
			.then(data => {
				// Display current location
				$(location).text(data.address.town);
			})
			.catch(err => handleError(err));
	}

	// Call Dark Sky API and process response to JSON format
	const getWeatherData = (latitude, longitude) => {
		const proxy = 'https://cors-anywhere.herokuapp.com/'; // Enables cross-origin requests to anywhere.
		const dsAPI = `${proxy}https://api.darksky.net/forecast/6385bf526a557ab35c6534562b693fdc/${latitude},${longitude}?units=si`;

		fetch(dsAPI)
			.then(response => {
				return response.json();
			})
			.then(data => {
				// Determine the current time in minutes when API sent response
				let fetchDateObj = new Date();
				lastFetchTime = fetchDateObj.getHours()*60 + fetchDateObj.getMinutes();

				// Show time since last API call and update every second.
				setInterval(updateTime, 1000);

				// Populate DOM elements with weather data
				setDOMelements(data);

			})
			.catch(err => handleError(err));
	}

	// Set DOM elements with updated weather data from API
	const setDOMelements = (weatherData) => {

		/***************\
		 CURRENT WEATHER
		\***************/
		const { apparentTemperature,
				temperature,
				humidity,
				icon,
				summary,
				windBearing,
				windSpeed,
				uvIndex } = weatherData.currently;

		$(currentTemp).text(Math.round(temperature));
		$(tempSummary).text(summary);

		// Set Skycon glyph
		setSkycons($("#current-icon")[0], icon);

		// Comfort Level Data
		let humidityVal = Math.round(humidity*100);
		$(humidityBar).find(".progress-bar")
			.attr("aria-valuenow", `${humidityVal}`)
			.width(`${humidityVal}%`)
			.text(`${humidityVal}%`);
		$(feelsLike).text(`${Math.round(apparentTemperature)}`);
		$(uvIndexVal).text(uvIndex);

		// Wind Data
		$(windDirection).text(degreesToCompass(windBearing)); // Convert degrees to textual compass direction
		$(windVelocity).text(Math.round(windSpeed*3.6)); // Convert metres/second to kilometres/hour

		/***********************\
		 UPCOMING HOURLY WEATHER
		\***********************/
		const hourlyData = weatherData.hourly.data;
		let nextHour, nextHourIcon, nextHourTemp;

		for (let i = 0; i < 6; i++){
			let nextHourInfo = convertUnixTime(hourlyData[i].time);
			// Get and set next hour (i = 0 represents the current hour in time, which the app will just show as "Now")
			nextHour = i === 0? "Now" : nextHourInfo.hour;
			$(hours[i]).text(nextHour);

			// Get and set weather icon for next hour
			nextHourIcon = hourlyData[i].icon;
			$(hourlyIcons[i]).attr("src", `images/${nextHourIcon}.png`)

			// Get and set temperature for next hour
			nextHourTemp = Math.round(hourlyData[i].temperature);
			$(hourlyTemps[i]).text(nextHourTemp);
		}

		/************************\
		 FORECASTED DAILY WEATHER
		\************************/
		const dailyData = weatherData.daily.data;
		let nextDay, nextDayIcon;

		// Set max/min temperature for today
		$(currentMaxTemp).text(`${Math.round(dailyData[0].temperatureMax)}`);
		$(currentMinTemp).text(`${Math.round(dailyData[0].temperatureMin)}`);

		for (let j = 1; j <= 3; j++){
			let nextDayInfo = convertUnixTime(dailyData[j].time);
			// Set next day's date. j = 0 represents today in the API. For j = 1, the app will just show "Tomorrow"
			nextDay = j === 1? "Tomorrow" : nextDayInfo.day;
			$(forecastDays[j-1]).find(".date").text(`${nextDay}, ${nextDayInfo.date} ${nextDayInfo.month}`);

			// Get and set icon for next day
			nextDayIcon = dailyData[j].icon
			$(forecastDays[j-1]).find(".weather-icon").attr("src", `images/${nextDayIcon}.png`);

			// Get and set max/min temperature for next day
			let { temperatureMax, temperatureMin } = dailyData[j];
			$(forecastDays[j-1]).find(".max-temp").text(`${Math.round(temperatureMax)}`);
			$(forecastDays[j-1]).find(".min-temp").text(`/ ${Math.round(temperatureMin)}`);
		}
		return;
	}

	// Convert unix timestamp (in seconds) to readable date-time values
	const convertUnixTime = (unix) => {
		let nextDate = new Date(unix*1000); //JS Date Object uses milliseconds
		let monthArr = [ // Initialise array of month string values, since getMonth returns an integer (0-11) 
			"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
		];
		let dayArr = [ // Similarly for the days of the week
			"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
		];
		let convertedDate = { // Storage for date-time values extracted from unix timestamp
			hour : "",
			day : "",
			date : "",
			month : ""
		}

		convertedDate.hour = `${nextDate.getHours()}:00`;
		convertedDate.day = dayArr[nextDate.getDay()];
		convertedDate.date = nextDate.getDate();
		convertedDate.month = monthArr[nextDate.getMonth()];

		return convertedDate;
	}

	// Update time since weather data was fetched
	const updateTime = () => {
		let currentTime = (new Date()).getHours()*60 + (new Date()).getMinutes(); // Current time in minutes
		let minutes_since_update = Math.abs(currentTime - lastFetchTime);

		// Adjust message for if only one minute or several MINUTES have passed
		let updateMsg = `Updated ${minutes_since_update} ${minutes_since_update === 1? 'minute' : 'minutes'} ago`;

		$(updateCounter).text(updateMsg);
	}

	// Approximate compass direction from given wind bearing in degress with North defined at 0/360deg
	const degreesToCompass = (deg) => {
		let windDirections = [
		"North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"
		];
		let bearing = Math.round(deg/45) % 8; // 8 direction points on compass and 360deg / 8 gives 45deg
		return windDirections[bearing];
	}

	// Set animated Skycon weather glyph according to icon summary retrieved from API
	const setSkycons = (iconID, iconSummary) => {
		let skycon = new Skycons({color: 'white'});
		let skyconSummary = iconSummary.replace(/-/g, '_').toUpperCase();
		skycon.play();
		return skycon.set(iconID, Skycons[skyconSummary]);
	}
});