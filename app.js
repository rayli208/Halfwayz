//ON LOAD FIND LOCATION
google.maps.event.addDomListener(window, "load", getLocation);

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    } else {
        aler("Geolocation is not supported by this browser.");
    }
}

//DEFAULT LOCATION - NEW YORK
var lat = 40.7128;
var lng = -74.0060;

//GLOBAL VARIABLES
var myLatLng = {
    lat: lat,
    lng: lng
};

var mapOptions = {
    center: myLatLng,
    zoom: 7,
    mapTypeId: google.maps.MapTypeId.ROADMAP
};

//CREATE AUTOCOMPLETE OBJECTS FOR THE INPUT FIELDS
var options = {
    fields: ["formatted_address", "geometry", "name"],
    strictBounds: false,
    types: ["address"],
}

//SET UP AUTOCOMPLETE FUNCTIONALITY
var input1 = document.getElementById("from");
var autocomplete1 = new google.maps.places.Autocomplete(input1, options);

var input2 = document.getElementById("to");
var autocomplete2 = new google.maps.places.Autocomplete(input2, options);


//SET UP CURRENT LOCATION
function showPosition(position) {
    myLatLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };

    mapOptions = {
        center: myLatLng,
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP

    };
    map = new google.maps.Map(document.getElementById('googleMap'), mapOptions);

    var marker = new google.maps.Marker({
        position: myLatLng,
        title: "YOU!"
    });

    // ADD MARKER TO THE MAP
    marker.setMap(map);


    //CONVERT LON AND LAT INTO AN ADDRESS
    var geocoder = new google.maps.Geocoder();
    var latLng = new google.maps.LatLng(myLatLng.lat, myLatLng.lng);

    if (geocoder) {
        geocoder.geocode({
            'latLng': latLng
        }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                input1.value = results[0].formatted_address;
            } else {
                console.log("Geocoding failed: " + status);
            }
        });
    }
}

//CREATE THE MAP
var map = new google.maps.Map(document.getElementById('googleMap'), mapOptions);

//create a DirectionsService object to use the route method and get a result for our request
var directionsService = new google.maps.DirectionsService();

//CREATE DIRECTION RENDER TO BE ABLE TO BIND TWO LOCATIONS
var directionsDisplay = new google.maps.DirectionsRenderer();


//CALCROUTE FUNCTION
function calcRoute() {
    //create request
    var request = {
        origin: document.getElementById("from").value,
        destination: document.getElementById("to").value,
        travelMode: google.maps.TravelMode.DRIVING, //WALKING, BYCYCLING, TRANSIT
        unitSystem: google.maps.UnitSystem.IMPERIAL
    }

    //PASS REQUEST TO THE ROUTE METHOD
    directionsService.route(request, function (result, status) {
        if (status == google.maps.DirectionsStatus.OK) {

            //GET DISTANCE AND TIME
            const output = document.querySelector('#output');
            output.innerHTML = "<div class='alert-info'>From: " + document.getElementById("from").value + ".<br />To: " + document.getElementById("to").value + ".<br /> Driving distance <i class='fas fa-road'></i> : " + result.routes[0].legs[0].distance.text + ".<br />Duration <i class='fas fa-hourglass-start'></i> : " + result.routes[0].legs[0].duration.text + ".</div>";

            //DISPLAY ROUTE
            directionsDisplay.setDirections(result);

            //BIND DIRECTION RENDER TO THE MAP
            directionsDisplay.setMap(map);
        } else {
            //DELETE ROUTES
            directionsDisplay.setDirections({
                routes: []
            });
            //CENTER MAP ON LOCATION OR NEW YORK DEFAULT
            map.setCenter(myLatLng);

            //SHOW ERROR
            output.innerHTML = "<div class='alert-danger'><i class='fas fa-exclamation-triangle'></i> Could not retrieve driving distance.</div>";
        }
    });
}