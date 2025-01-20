'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription(title) {
    this.description = title;
  }

  _setDate(date) {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true, // For AM/PM format
      timeZone: 'UTC', // Explicitly set to UTC
    };

    const formattedDate = new Date(date).toLocaleString('en-US', options);
    this.date = formattedDate;
  }

  // _setCity(lat_lng) {
  //   const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat_lng[0]}&lon=${lat_lng[1]}`;

  //   fetch(url)
  //     .then(response => response.json())
  //     .then(data => {
  //       const city =
  //         data.address.city_district ||
  //         data.address.city ||
  //         data.address.village ||
  //         'Unknown';
  //       console.log(city);
  //       this.city = city;
  //     })
  //     .catch(error => console.error('Error:', error));
  // }

  // click() {
  //   this.clicks++;
  // }
}

class Running extends Workout {
  type = 'running'; // property willbe avaliable on all instances

  constructor(stravaId, coords, distance, duration, elevationGain) {
    super(coords, distance, duration, elevationGain);
    this.stravaId = stravaId;
    this.elevationGain = elevationGain;
    this.calcPace();
    this._setDescription();
    this._setDate();
    // this._setCity();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Hiking extends Workout {
  type = 'hiking'; // property willbe avaliable on all instances

  constructor(stravaId, coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.stravaId = stravaId;
    this.elevationGain = elevationGain;
    this.calcPace();
    this._setDescription();
    this._setDate();
    // this._setCity();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling'; // property willbe avaliable on all instances

  constructor(stravaId, coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.stravaId = stravaId;
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
    this._setDate();
    // this._setCity();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class Kayaking extends Workout {
  type = 'kayaking'; // property willbe avaliable on all instances

  constructor(stravaId, coords, distance, duration) {
    super(coords, distance, duration);
    this.stravaId = stravaId;
    this._setDescription();
    this._setDate();
    this.calcSpeed();
    // this._setCity();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/////////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
// const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const afterDate = document.querySelector('.form__input--start-date');
const beforeDate = document.querySelector('.form__input--end-date');

const stravaAuth = document.querySelector('.form__btn--auth');

// const workoutElement = document.querySelector(
//   `.workout[data-id="${workout.id}"]`
// );

// workoutElement.addEventListener('mouseenter', () => {
//   console.log('Mouse over');
//   if (workout.marker) workout.marker.addTo(this._map);
// });

// workoutElement.addEventListener('mouseleave', () => {
//   if (workout.marker) workout.marker.removeFrom(this._map);
// });

class App {
  // '#' private class fields
  _map;
  _mapZoomLevel = 13;
  _mapEvent;
  _workouts = [];
  _formOpen = true;

  _startDate = '2024-05-25';
  _endDate = '2024-06-30';
  _accessToken;

  constructor() {
    this._workouts = [];
    this._showDefaultData = localStorage.getItem('showDefaultData') !== 'false';
    this._accessToken = localStorage.getItem('accessToken');

    // Calculate today's date and one month ago
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    // Set default values for the inputs
    afterDate.value =
      localStorage.getItem('startDate') || this._formatDate(oneMonthAgo);
    beforeDate.value =
      localStorage.getItem('endDate') || this._formatDate(today);
    this._getLocalStorage();
    console.log(this._workouts);

    // this._getPosition();

    form.addEventListener('submit', this._formSubmit.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    stravaAuth.addEventListener('click', async function () {
      // Disable showDefaultData permanently
      this._showDefaultData = false;
      localStorage.setItem('showDefaultData', 'false');

      // Clear test data
      localStorage.removeItem('workouts');
      this._workouts = [];
      window.location.href = '/.netlify/functions/strava-auth';
    });

    // Check url for code and exchange it for an access token
    window.onload = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code'); // Get the code from the URL

      // Get auth code if not already stored
      if (code && this._accessToken === null) {
        try {
          // Fetch the access token from the Netlify function
          const response = await fetch(
            `/.netlify/functions/exchange-token?accessToken=${code}`
          );
          const data = await response.json();

          if (data.access_token) {
            // Store the access token for use in API calls
            this._accessToken = data.access_token;
            localStorage.setItem('accessToken', data.access_token);
          } else {
            console.error('Error retrieving access token:', data);
          }
        } catch (error) {
          console.error('Error during authentication:', error);
        }
      }
    };
  }

  async _fetchStravaActivities(afterDate, beforeDate) {
    try {
      const response = await fetch('/.netlify/functions/fetch-activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          afterDate,
          beforeDate,
          accessToken: this._accessToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const activities = await response.json();
      // Filter out duplicates
      const uniqueActivities = activities.filter(
        activity => !this._workouts.some(w => w.stravaId === activity.id)
      );
      // Display a message if activities are found

      // Track skipped activities
      const skippedActivities = [];

      await Promise.all(
        uniqueActivities.map(async activity => {
          const supportedTypes = ['Run', 'Hike', 'Ride', 'Kayaking'];
          if (!supportedTypes.includes(activity.type) || activity.trainer) {
            console.warn(`Skipping unsupported activity: ${activity.type}`);
            skippedActivities.push(activity);
            return;
          }
          await this._processStravaActivity(activity);
        })
      );

      // Set local storage after processing
      this._setLocalStorage();

      const existingMessage = form.querySelector(
        '.submission__message, .success__message, .info__message'
      );
      if (existingMessage) {
        existingMessage.remove();
      }

      let innerHTML;

      if (uniqueActivities.length > skippedActivities.length) {
        const processedCount =
          uniqueActivities.length - skippedActivities.length;
        innerHTML = `
      <div class="success__message">
        ${processedCount} activities were successfully imported!
        ${
          skippedActivities.length > 0
            ? skippedActivities.length + ' activities were skipped.'
            : ''
        }
      </div>`;
      } else if (skippedActivities.length > 0) {
        innerHTML = `
      <div class="submission__message">
        <span class="text">All activities were skipped (${skippedActivities.length}). No supported activities found.</span>
      </div>`;
      } else {
        innerHTML = `
      <div class="info__message">
        No activities found for the selected date range.
      </div>`;
      }

      // Insert the message
      form.insertAdjacentHTML('beforeend', innerHTML);

      // Make the message disappear after 5 seconds
      setTimeout(() => {
        const message = form.querySelector(
          '.submission__message, .success__message, .info__message'
        );
        if (message) {
          message.classList.add('fade-out');
        }
      }, 5000);

      return uniqueActivities;
    } catch (error) {
      console.error('Error fetching Strava activities:', error);
    }
  }

  // TODO: before rendering workout, check if it already exists
  async _processStravaActivity(activity) {
    const {
      id: stravaId,
      start_latlng: coords,
      distance,
      moving_time,
      total_elevation_gain,
      name,
      start_date_local,
    } = activity;

    const workoutTypes = {
      Run: Running,
      Hike: Hiking,
      Ride: Cycling,
      Kayaking: Kayaking,
    };

    const WorkoutClass = workoutTypes[activity.type];
    if (!WorkoutClass || activity.trainer) {
      console.warn(`Skipping unsupported activity type: ${activity.type}`);
      return;
    }

    const workout = new WorkoutClass(
      stravaId,
      coords,
      distance / 1000, // convert to km
      moving_time / 60, // convert to min
      total_elevation_gain || 0 // default elevation to 0
    );

    workout._setDescription(name);
    workout._setDate(start_date_local);

    try {
      // Fetch and attach stream data
      const streamData = await this._listActivitiesAndStreams(stravaId);
      if (streamData && streamData.data) {
        workout.stream = streamData.data;

        // Render stream on the map
        const latlngs = streamData.data.map(([lat, lng]) => [lat, lng]);
        L.polyline(latlngs, { color: 'red', opacity: 0.5 }).addTo(this._map);
      } else {
        console.warn(`No stream data for activity: ${stravaId}`);
      }

      // Add workout to list and render
      this._workouts.push(workout);
      this._renderWorkoutMarker(workout);
      this._renderWorkout(workout);
    } catch (error) {
      console.error(`Error processing activity ${stravaId}:`, error);
    }
  }

  async _listActivitiesAndStreams(activityId) {
    try {
      const response = await fetch('/.netlify/functions/fetch-strava-streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId,
          accessToken: this._accessToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch streams for activity: ${activityId}`);
      }

      const stream = await response.json();
      return stream || null;
    } catch (error) {
      console.error(
        `Error fetching streams for activity: ${activityId}`,
        error
      );
      return null;
    }
  }

  _getPosition() {
    if (this._showDefaultData) {
      console.warn('Default data mode is enabled. Loading default location.');
      // Load the default location directly
      this._loadMap({ coords: { latitude: 49.2827, longitude: -123.1207 } }); // Sample: Vancouver
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
        console.warn('Could not get your position. Loading default location.');
        // Fallback to default location if geolocation fails
        this._loadMap({ coords: { latitude: 40.7128, longitude: -74.006 } }); // Example: New York City
      });
    } else {
      console.error(
        'Geolocation not supported and default data mode is disabled.'
      );
      alert('Could not get your position, and no default data is available.');
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this._map = L.map('map').setView(coords, this._mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this._map);

    this._workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });

    this._workouts.forEach(work => {
      if (work.stream) {
        // Render stream data on the map if available
        const latlngs = work.stream.map(([lat, lng]) => [lat, lng]);

        // Leaflet format
        // const bounds = L.latLngBounds(latlngs);
        // map.fitBounds(bounds);

        L.polyline(latlngs, {
          color: 'red',
          opacity: 0.5,
        }).addTo(this._map);
      }
    });
    // .catch(error => console.error('Error loading stream data:', error));
  }

  _hideForm() {
    // Select the form
    const form = document.querySelector('.form');

    // Hide all direct children of the form except the header
    Array.from(form.children).forEach(child => {
      if (!child.classList.contains('form__header')) {
        child.style.display = 'none';
      }
    });

    // Remove padding/margin from the form
    form.style.padding = '0';

    // this._formOpen = false;
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _formSubmit(e) {
    e.preventDefault();

    const startDate = afterDate.value;
    const endDate = beforeDate.value;

    const validDateInputs = (...inputs) =>
      inputs.every(input => input && !isNaN(new Date(input).getTime()));

    // Validate the inputs
    if (!validDateInputs(startDate, endDate)) {
      return alert('Please provide valid start and end dates.');
    }

    // Parse dates for further processing
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (parsedStartDate > parsedEndDate) {
      return alert('Start date must be before or equal to end date.');
    }

    this._startDate = startDate;
    this._endDate = endDate;

    localStorage.setItem('startDate', startDate);
    localStorage.setItem('endDate', endDate);

    this._fetchStravaActivities(this._startDate, this._endDate);
  }

  _renderWorkoutMarker(workout) {
    // Define a mapping of activity types to image URLs
    const activityIcons = {
      running: 'icons/running.svg',
      cycling: 'icons/cycling.svg',
      hiking: 'icons/hiking.svg',
      kayaking: 'icons/kayaking.svg',
      // TODO: add more activity types
    };

    // Fallback for unknown types
    const iconUrl = activityIcons[workout.type] || 'icons/running.svg';

    // Create a custom popup with an image
    const popupContent = `
      <div class="icon-text">
        <img src="${iconUrl}" alt="${workout.type}" class="workout__icon" />
        <span class="text">${workout.description}</span>
      </div>
    `;

    L.marker(workout.coords)
      .addTo(this._map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: true,
          closeOnClick: true,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(popupContent)
      .openPopup();
  }

  // Helper function to format date to YYYY-MM-DD
  _formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _getFormattedTime(timeMinutes) {
    let totalSeconds = Math.floor(timeMinutes * 60); // Convert mins to total secs
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    // Determine the display format
    let duration =
      hours > 0
        ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}`
        : `${minutes}:${seconds.toString().padStart(2, '0')}`;
    return duration;
  }

  _renderWorkout(workout) {
    let formattedDuration = this._getFormattedTime(workout.duration);

    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <h3 class="workout__date">${workout.date}</h3>
      <div class="workout__details">
          <img 
            src="icons/${workout.type}.svg" 
            alt="${workout.type} icon" 
            class="workout__icon"
          />
        
        <span class="workout__value">${workout.distance.toFixed(2)}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <img 
            src="icons/stopwatch.svg" 
            alt="stopwatch icon" 
            class="workout__icon"
          />
        <span class="workout__value">${formattedDuration}</span>
      </div>
      `;

    if (workout.type === 'running') {
      let formattedPace = this._getFormattedTime(workout.pace);
      html += `
        <div class="workout__details">
          <img 
            src="icons/gauge.svg" 
            alt="stopwatch icon" 
            class="workout__icon"
          />
          <span class="workout__value">${formattedPace}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <img 
            src="icons/mountain.svg" 
            alt="mountain icon" 
            class="workout__icon"
          />
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
          `;
    }
    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <img 
            src="icons/gauge.svg" 
            alt="stopwatch icon" 
            class="workout__icon"
          />
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <img 
            src="icons/mountain.svg" 
            alt="mountain icon" 
            class="workout__icon"
          />
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    if (workout.type === 'hiking') {
      let formattedPace = this._getFormattedTime(workout.pace);
      html += `
      <div class="workout__details">
          <img 
            src="icons/gauge.svg" 
            alt="stopwatch icon" 
            class="workout__icon"
          />
          <span class="workout__value">${formattedPace}</span>
          <span class="workout__unit">min/km</span>
        </div>
          <div class="workout__details">
            <img 
            src="icons/mountain.svg" 
            alt="mountain icon" 
            class="workout__icon"
          />
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
        `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this._workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this._renderWorkoutMarker(workout);

    this._map.setView(workout.coords, this._mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //using the public interface
    // workout.click(); // not inherited when converteingh to local storage
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this._workouts)); // Key value store arguments; name, string
  }

  _getLocalStorage() {
    const isStravaAuthorized = !!localStorage.getItem('accessToken');
    const data = JSON.parse(localStorage.getItem('workouts'));

    // If no data and test data should be shown
    if (!data && this._showDefaultData && !isStravaAuthorized) {
      this._loadSampleData(); // Load and render test data
      return;
    }

    // If Strava is authorized, clear test data and reset workouts
    if (isStravaAuthorized && this._showDefaultData) {
      localStorage.removeItem('workouts');
      this._workouts = [];
      this._getPosition();

      return;
    }

    // Otherwise, load data from localStorage and render it
    if (data) {
      this._workouts = data;
      this._workouts.forEach(work => this._renderWorkout(work));
    }
    this._getPosition();
  }

  // Load sample workouts data
  async _loadSampleData() {
    try {
      const response = await fetch('sample-activities.json');
      const testData = await response.json();
      this._workouts = testData;

      this._workouts.forEach(work => {
        this._renderWorkout(work);
      });

      // Save the test data to localStorage for persistence
      localStorage.setItem('workouts', JSON.stringify(this._workouts));
      this._getPosition();
    } catch (error) {
      console.error('Error loading test data:', error);
    }
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
