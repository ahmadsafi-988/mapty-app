'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

////// geolocation api

// this function recieves two callback functions , one when the user agree to share his location and the other
// one when he declines

class Workout {
  date = new Date();
  id = String(Date.now()).slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(
      1
    )} on ${this.date.getDate()} ${months[this.date.getMonth()]}
    `;
  }

  click() {
    this.clicks++;
    console.log(this.clicks);
  }
}

// child classes

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min / km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km / h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// TRIALS

// setTimeout(function () {
//   const run1 = new Running([49, -4], 5, 20, 2);
//   console.log(run1);
// }, 1500);

// setTimeout(function () {
//   const cycling1 = new Cycling([49, -4], 50, 25, 21);
//   console.log(cycling1);
// }, 3000);

///// Architecture /////
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #zomLevel = 13;
  // just to know if we put  eventListeners in the construcor of the class , the callback function it is gonna happen when the event occurs
  // when the page is loaded
  constructor() {
    this._getPosition();

    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));
    // there is no need to use bind method because in the function we dont use the the (this) keyWord
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  // this function for getting the position
  // NOTE THAT : in this function we inovked the loadMap function but note that it is call back function so it is considered a regualr
  // ...call function so the this keyword points to undefined thats why we use bind mthod
  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        console.log('we cant get your current position');
      }
    );
  }

  // this function is gonna recieve a position then load it using leftleet library
  _loadMap(position) {
    const { longitude } = position.coords;
    const { latitude } = position.coords;

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#zomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup('A pretty CSS popup.<br> Easily customizable.');

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // this function is called when we click on the map
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // empty the fields
    // prettier-ignore
    inputDistance.value = inputDuration.value = inputElevation.value = inputCadence.value ='';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(function () {
      form.style.display = 'grid';
    }, 1000);
  }

  // for change input
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // for submit event ,  this function is gonna do data validtion before submiting
  _newWorkout(e) {
    e.preventDefault();
    //some helper functions
    const checkNumbers = (...inputs) => {
      return inputs.every(input => Number.isFinite(input));
    };

    const checkPostivity = (...inputs) => {
      return inputs.every(input => input > 0);
    };

    // get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // check if the data is valid

    // if workout is running create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !checkNumbers(distance, duration, cadence) ||
        !checkPostivity(distance, duration, cadence)
      ) {
        alert('please just enter  positive Numbers');
        return;
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // if workout is cycling create cycling object

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !checkNumbers(distance, duration, elevation) ||
        !checkPostivity(distance, duration, elevation)
      ) {
        alert('please just enter  positive Numbers');
        return;
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // add new object to the workout array
    this.#workouts.push(workout);
    // render workout on map as markers
    this._renderWorkoutMarker(workout);

    // render workout in the list
    this._renderWorkout(workout);
    // hide the form
    this._hideForm();

    // set local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${'running' ? '🏃' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(2)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(2)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li> -->`;
    }

    form.insertAdjacentHTML('afterEnd', html);
  }

  _moveToPopup(e) {
    const el = e.target.closest('.workout');

    if (!el) return;

    const workout = this.#workouts.find(
      workout => el.dataset.id === workout.id
    );
    console.log(workout);
    this.#map.setView(workout.coords, this.#zomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);
    if (!data) return;

    this.#workouts = data;

    // rendering workout
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
