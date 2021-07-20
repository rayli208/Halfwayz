//INITIALIZE
google.maps.event.addDomListener(window, 'load', initialize);

var directionsService = new google.maps.DirectionsService();
var map;
var polyline;
var midpoint = {
    lat: 0,
    lng: 0
};
let markers = [];
let circles = [];
var infowindow = new google.maps.InfoWindow();
//GEOCODER OBJECT
var geocoder = new google.maps.Geocoder();
//CREATE DIRECTION RENDER TO BE ABLE TO BIND TWO LOCATIONS
var directionsDisplay = new google.maps.DirectionsRenderer();

//CREATE AUTOCOMPLETE OBJECTS FOR THE INPUT FIELDS
var options = {
    fields: ["formatted_address", "geometry", "name"],
    strictBounds: false,
    types: ["address"],
}

//SET UP AUTOCOMPLETE FUNCTIONALITY
var input1 = document.getElementById("start");
var autocomplete1 = new google.maps.places.Autocomplete(input1, options);
var input2 = document.getElementById("end");
var autocomplete2 = new google.maps.places.Autocomplete(input2, options);
var totalDist = 0;
var totalTime = 0;

//DEFAULT LOCATION - NEW YORK
var lat = 40.7128;
var lng = -74.0060;
//GLOBAL VARIABLES
var myLatLng = {
    lat: lat,
    lng: lng
};

var myOptions = {
    center: myLatLng,
    zoom: 14,
    mapTypeId: google.maps.MapTypeId.ROADMAP
};

























function initialize() {
    getLocation();
}

//CREATE THE MID POINT MARKER
function createMarker(latlng, label, html) {
    deleteMarkers();

    var contentString = '<b>' + label + '</b><br>' + html;
    var marker = new google.maps.Marker({
        position: latlng,
        map: map,
        title: label,
        zIndex: Math.round(latlng.lat() * -100000) << 5
    });

    // Add circle overlay and bind to marker
    var circle = new google.maps.Circle({
        map: map,
        radius: 2000, // 10 miles in metres
        fillColor: '#AA0000'
    });
    circle.bindTo('center', marker, 'position');

    marker.myname = label;

    google.maps.event.addListener(marker, 'click', function () {
        infowindow.setContent(contentString + "<br>" + marker.getPosition().toUrlValue(6));
        infowindow.open(map, marker);
    });

    markers.push(marker);
    circles.push(circle);

    return marker;
}

function getLocation() {
    //GET LOCATION
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    } else {
        alert("Geolocation is not supported by this browser.");
    }

    //PAINT A LINE FROM DESTINATION TO DESTINATION
    polyline = new google.maps.Polyline({
        path: [],
        strokeColor: 'purple',
        strokeWeight: 5
    });
}

function showPosition(position) {
    myLatLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };

    myOptions = {
        center: myLatLng,
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map(document.getElementById('map_canvas'), myOptions);

    var marker = new google.maps.Marker({
        position: myLatLng,
        title: "YOU!"
    });

    // ADD MARKER TO THE MAP
    marker.setMap(map);

    //CONVERT LON AND LAT INTO AN ADDRESS
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

function calcRoute() {
    var start = document.getElementById("start").value;
    var end = document.getElementById("end").value;
    var travelMode = google.maps.DirectionsTravelMode.DRIVING

    var request = {
        origin: start,
        destination: end,
        travelMode: travelMode
    };
    directionsService.route(request, function (response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            polyline.setPath([]);
            var bounds = new google.maps.LatLngBounds();
            startLocation = new Object();
            endLocation = new Object();
            directionsDisplay.setDirections(response);
            var summaryPanel = document.getElementById("directions_panel");
            summaryPanel.innerHTML = "";

            // For each route, display summary information.
            var legs = response.routes[0].legs;
            for (i = 0; i < legs.length; i++) {
                if (i == 0) {
                    startLocation.latlng = legs[i].start_location;
                    startLocation.address = legs[i].start_address;
                    marker = createMarker(legs[i].start_location, "MidPoint", "");
                }
                endLocation.latlng = legs[i].end_location;
                endLocation.address = legs[i].end_address;
                var steps = legs[i].steps;
                for (j = 0; j < steps.length; j++) {
                    var nextSegment = steps[j].path;
                    for (k = 0; k < nextSegment.length; k++) {
                        polyline.getPath().push(nextSegment[k]);
                        bounds.extend(nextSegment[k]);
                    }
                }
            }

            polyline.setMap(map);

            computeTotalDistance(response);
            //CENTER MAP ON MIDPOINT AND ZOOM OUT A BIT
            map.setCenter(midpoint);
            map.setZoom(10);
            //WRITE OUT MID POINT COORDINATES
            document.getElementById("midpoint").innerHTML = "Longitude of midpoint is: " + midpoint.lng + "</br> Latitude of midpoint is " + midpoint.lat;
            getRestaurauntInfo(midpoint);
        } else {
            alert("directions response " + status);
        }
    });
}

//CALCULATE DISTANCE BETWEEN START AND END
function computeTotalDistance(result) {
    totalDist = 0;
    totalTime = 0;
    var myroute = result.routes[0];
    for (i = 0; i < myroute.legs.length; i++) {
        totalDist += myroute.legs[i].distance.value;
        totalTime += myroute.legs[i].duration.value;
    }
    putMarkerOnRoute(50);

    totalDist = totalDist / 1000.
    document.getElementById("total").innerHTML = "total distance is: " + totalDist + " km<br>total time is: " + (totalTime / 60).toFixed(2) + " minutes";
}

//PUT THE MARKER ON ROAD DEPENDING ON PERCENTAGE
function putMarkerOnRoute(percentage) {
    var distance = (percentage / 100) * totalDist;
    var time = ((percentage / 100) * totalTime / 60).toFixed(2);
    if (!marker) {
        marker = createMarker(polyline.GetPointAtDistance(distance), "time: " + time, "marker");
    } else {
        marker.setPosition(polyline.GetPointAtDistance(distance));
        marker.setTitle("time:" + time);
    }

}

// from http://www.geocodezip.com/scripts/v3_epoly.js, modified to use the geometry library
// === A method which returns a GLatLng of a point a given distance along the path ===
// === Returns null if the path is shorter than the specified distance ===
google.maps.Polyline.prototype.GetPointAtDistance = function (metres) {
    // some awkward special cases
    if (metres == 0) return this.getPath().getAt(0);
    if (metres < 0) return null;
    if (this.getPath().getLength() < 2) return null;
    var dist = 0;
    var olddist = 0;
    for (var i = 1;
        (i < this.getPath().getLength() && dist < metres); i++) {
        olddist = dist;
        dist += google.maps.geometry.spherical.computeDistanceBetween(this.getPath().getAt(i), this.getPath().getAt(i - 1));
    }
    if (dist < metres) {
        return null;
    }
    var p1 = this.getPath().getAt(i - 2);
    var p2 = this.getPath().getAt(i - 1);
    var m = (metres - olddist) / (dist - olddist);
    var newMap = new google.maps.LatLng(p1.lat() + (p2.lat() - p1.lat()) * m, p1.lng() + (p2.lng() - p1.lng()) * m);
    //THE MIDPOINT
    midpoint.lat = Number(newMap.lat());
    midpoint.lng = Number(newMap.lng());
    return newMap;
}

// //DELETE ALL MARKERS BY REMOVING THEIR REFERENCE
function deleteMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    for (let i = 0; i < circles.length; i++) {
        circles[i].setMap(null);
    }
    markers = [];
    circles = [];
}

//GET RESTAURAUNT INFO
function getRestaurauntInfo(location){
    console.log(location);
    var pyrmont = new google.maps.LatLng(location.lat, location.lng);
    var request = {
        location: pyrmont,
        radius: '2000',
        type: ['restaurant']
    };
    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, callback);
}

//SET UP MARKERS
function callback(results, status){
    if(status == google.maps.places.PlacesServiceStatus.OK){
        for(var i = 0; i < results.length; i++){
            var place = results[i];
            let price = createPrice(place.price_level);
            let content = `
            <h3>${place.name}</h3>
            <h4>Price: ${place.vicinity}</h4>
            <div>Price: ${price}</div>
            <div>${place.rating}</div>
            `;

            var marker = new google.maps.Marker({
                position: place.geometry.location,
                map: map,
                title: place.name
            });

            markers.push(marker);

            var infowindow = new google.maps.InfoWindow({
                content: content
            });

            bindInfoWindow(marker, map, infowindow, content);
            marker.setMap(map);
        }
    }
}

//BIND CLICK EVENT TO MARKERS
function bindInfoWindow(marker, map, infowindow, html){
    marker.addListener('click', function(){
        infowindow.setContent(html);
        infowindow.open(map, this);
    });
}

//CREATE PRICING
function createPrice(level){
    if(level != "" && level != null){
        let out = "";
        for (var x = 0; x < level; x++){
            out += "$";
        }
        return out;
    }else{
        return "?";
    }
}