const apiKey = '7cde4b1656fae237851b00c5e796fe66';
let currentCity = 'Jamshedpur';
let currentCountry = 'IN';
const forecastContainer = document.querySelector('.forecast-container');
const locationDisplay = document.querySelector('.location');

// Add search functionality
const searchBox = document.querySelector('.search-box');
const searchButton = document.querySelector('.search-container button');

document.addEventListener('DOMContentLoaded', function() {
    // Initialize search functionality
    const locationDisplay = document.querySelector('.location-display span');

    // Add event listeners for search
    searchButton.addEventListener('click', () => {
        const searchTerm = searchBox.value.trim();
        if (searchTerm) {
            handleSearch(searchTerm);
        }
    });

    searchBox.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = searchBox.value.trim();
            if (searchTerm) {
                handleSearch(searchTerm);
            }
        }
    });

    // Initial fetch
    fetchWeatherData();
});

async function handleSearch(searchTerm) {
    try {
        // Show loading state
        const forecastContainer = document.querySelector('.forecast-container');
        if (forecastContainer) {
            forecastContainer.innerHTML = `
                <div class="loading">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <p>Searching for ${searchTerm}...</p>
                </div>
            `;
        }

        // Update current city and fetch new data
        currentCity = searchTerm;
        await fetchWeatherData();
    } catch (error) {
        console.error('Error searching city:', error);
        showError('City not found. Please check the spelling and try again.');
    }
}

async function fetchWeatherData() {
    try {
        // First, get coordinates for the city
        const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(currentCity)},${currentCountry}&limit=1&appid=${apiKey}`);
        
        if (!geoResponse.ok) {
            throw new Error('Failed to fetch location data');
        }
        
        const geoData = await geoResponse.json();
        
        if (!geoData.length) {
            throw new Error('City not found');
        }

        const { lat, lon, name, country } = geoData[0];
        currentCountry = country; // Update the country code
        
        // Update location display
        const locationDisplay = document.querySelector('.location-display span');
        if (locationDisplay) {
            locationDisplay.textContent = `${name}, ${country}`;
        }

        // Then, get the 7-day forecast
        const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
        
        if (!forecastResponse.ok) {
            throw new Error('Failed to fetch forecast data');
        }
        
        const forecastData = await forecastResponse.json();

        if (!forecastData.list || !Array.isArray(forecastData.list)) {
            throw new Error('Invalid forecast data received');
        }

        // Process and display the forecast data
        displayForecast(forecastData);
        createTemperatureChart(forecastData);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        if (error.message === 'City not found') {
            showError('City not found. Please check the spelling and try again.');
        } else if (error.message.includes('Failed to fetch')) {
            showError('Unable to connect to the weather service. Please check your internet connection and try again.');
        } else {
            showError('An error occurred while fetching weather data. Please try again later.');
        }
    }
}

function displayForecast(data) {
    const forecastContainer = document.querySelector('.forecast-container');
    if (!forecastContainer) return;

    // Clear existing content
    forecastContainer.innerHTML = '<div class="forecast-cards"></div>';
    const forecastCards = forecastContainer.querySelector('.forecast-cards');

    // Group forecast data by day
    const dailyForecasts = {};
    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = date.toLocaleDateString();
        
        if (!dailyForecasts[day]) {
            dailyForecasts[day] = {
                date: date,
                temps: [],
                humidity: forecast.main.humidity,
                wind: forecast.wind.speed,
                weather: forecast.weather[0],
                pop: forecast.pop,
                feels_like: forecast.main.feels_like
            };
        }
        dailyForecasts[day].temps.push(forecast.main.temp);
    });

    // Create cards for each day
    Object.values(dailyForecasts).slice(0, 7).forEach((day, index) => {
        const dayName = index === 0 ? 'Today' : 
                       index === 1 ? 'Tomorrow' : 
                       day.date.toLocaleDateString('en-US', { weekday: 'long' });
        
        const formattedDate = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const maxTemp = Math.round(Math.max(...day.temps));
        const minTemp = Math.round(Math.min(...day.temps));
        const weatherIcon = getWeatherIcon(day.weather.main);
        const weatherDesc = day.weather.description.charAt(0).toUpperCase() + day.weather.description.slice(1);

        const card = `
            <div class="forecast-card ${index === 0 ? 'active' : ''}">
                <div class="forecast-date">
                    <span class="day-name">${dayName}</span>
                    <span class="date">${formattedDate}</span>
                </div>
                <div class="forecast-icon">
                    <i class="${weatherIcon}"></i>
                    <div class="weather-desc">${weatherDesc}</div>
                </div>
                <div class="forecast-temp">
                    <span class="temp-high">${maxTemp}°C</span>
                    <span class="temp-low">${minTemp}°C</span>
                </div>
                <div class="forecast-details">
                    <div class="detail">
                        <i class="fa-solid fa-droplet"></i>
                        <span>Humidity: ${day.humidity}%</span>
                    </div>
                    <div class="detail">
                        <i class="fa-solid fa-wind"></i>
                        <span>Wind: ${Math.round(day.wind * 3.6)} km/h</span>
                    </div>
                    <div class="detail">
                        <i class="fa-solid fa-cloud-rain"></i>
                        <span>Precip: ${Math.round(day.pop * 100)}%</span>
                    </div>
                    <div class="detail">
                        <i class="fa-solid fa-temperature-half"></i>
                        <span>Feels like: ${Math.round(day.feels_like)}°C</span>
                    </div>
                </div>
            </div>
        `;

        forecastCards.innerHTML += card;
    });
}

function createTemperatureChart(data) {
    const ctx = document.getElementById('tempChart');
    if (!ctx) return;

    // Get temperature data from the forecast
    const dailyData = {};
    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = date.toLocaleDateString();
        
        if (!dailyData[day]) {
            dailyData[day] = {
                temps: [],
                date: date
            };
        }
        dailyData[day].temps.push(forecast.main.temp);
    });

    const days = Object.values(dailyData).slice(0, 7).map(day => 
        day.date.toLocaleDateString('en-US', { weekday: 'short' })
    );
    
    const highTemps = Object.values(dailyData).slice(0, 7).map(day => 
        Math.round(Math.max(...day.temps))
    );
    
    const lowTemps = Object.values(dailyData).slice(0, 7).map(day => 
        Math.round(Math.min(...day.temps))
    );

    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'High Temperature (°C)',
                    data: highTemps,
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Low Temperature (°C)',
                    data: lowTemps,
                    borderColor: '#4dabf7',
                    backgroundColor: 'rgba(77, 171, 247, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#fff',
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#fff'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#fff',
                        callback: function(value) {
                            return value + '°C';
                        }
                    }
                }
            }
        }
    });
}

function getWeatherIcon(weatherMain) {
    const icons = {
        'Clear': 'fa-solid fa-sun',
        'Clouds': 'fa-solid fa-cloud',
        'Rain': 'fa-solid fa-cloud-rain',
        'Drizzle': 'fa-solid fa-cloud-rain',
        'Thunderstorm': 'fa-solid fa-bolt',
        'Snow': 'fa-solid fa-snowflake',
        'Mist': 'fa-solid fa-smog',
        'Smoke': 'fa-solid fa-smog'
    };
    return icons[weatherMain] || 'fa-solid fa-cloud';
}

function showError(message) {
    const forecastContainer = document.querySelector('.forecast-container');
    if (forecastContainer) {
        forecastContainer.innerHTML = `
            <div class="error-message">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// Function to get coordinates from city name
async function getCoordinates(city) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch location data');
        }
        
        const data = await response.json();
        
        if (data.length === 0) {
            throw new Error('City not found');
        }
        
        return {
            lat: data[0].lat,
            lon: data[0].lon,
            name: data[0].name,
            country: data[0].country
        };
    } catch (error) {
        console.error("Error getting coordinates:", error);
        throw error;
    }
}

// Function to search for a city
async function searchCity(city) {
    try {
        // Show loading state
        forecastContainer.innerHTML = `
            <div class="loading">
                <i class="fa-solid fa-spinner"></i>
                <p>Searching for location...</p>
            </div>
        `;
        
        const locationData = await getCoordinates(city);
        lat = locationData.lat;
        lon = locationData.lon;
        
        // Update location display
        locationDisplay.textContent = `${locationData.name}, ${locationData.country}`;
        
        // Fetch forecast for the new location
        await fetchWeatherData();
    } catch (error) {
        console.error("Error searching city:", error);
        forecastContainer.innerHTML = `
            <div class="error">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>City not found. Please check the spelling and try again.</p>
            </div>
        `;
    }
}

// Add event listeners for search
if (searchBox && searchButton) {
    searchButton.addEventListener('click', () => {
        const city = searchBox.value.trim();
        if (city) searchCity(city);
    });
    
    searchBox.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = searchBox.value.trim();
            if (city) searchCity(city);
        }
    });
} 