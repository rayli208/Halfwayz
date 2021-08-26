//PAINT A MAP ON LOAD
google.maps.event.addDomListener(window, 'load', initialize);

function initialize() {
    map = new google.maps.Map(document.getElementById('map_canvas'), myOptions);
}

//GET LOCATION
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

var map;
var directionsService = new google.maps.DirectionsService();
//CREATE DIRECTION RENDER TO BE ABLE TO BIND TWO LOCATIONS
var directionsDisplay = new google.maps.DirectionsRenderer();
var midpoint = {
    lat: 0,
    lng: 0
};
//PAINT A LINE FROM DESTINATION TO DESTINATION
var polyline = new google.maps.Polyline({
    path: [],
    strokeColor: 'purple',
    strokeWeight: 5
});
let markers = [];
let circles = [];
let diameter;
var infowindow = new google.maps.InfoWindow();
//GEOCODER OBJECT
var geocoder = new google.maps.Geocoder();

//DEFAULT LOCATION - NEW YORK
var lat = 40.7128;
var lng = -74.0060;

//GLOBAL VARIABLES
var myLatLng = {
    lat: lat,
    lng: lng
};

//MAP OPTIONS
var myOptions = {
    center: myLatLng,
    zoom: 14,
    mapTypeId: google.maps.MapTypeId.ROADMAP
};

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

//CREATE THE MID POINT MARKER
function createMarker(latlng, label, html) {
    var contentString = '<b>' + label + '</b><br>' + html;
    var marker = new google.maps.Marker({
        position: latlng,
        map: map,
        title: label,
        zIndex: Math.round(latlng.lat() * -100000) << 5
    });

    // ADD CIRCLE OVERLAY TO BIND TO MARKER
    var circle = new google.maps.Circle({
        map: map,
        radius: ($("#diameter").val() * 1609.344), //CONVERT MILES INTO METERS
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
    //EMPTY OUT THE CAROUSEL
    $('.carousel-item').remove();

    //DELETE MARKERS
    deleteMarkers();
    var start = document.getElementById("start").value;
    var end = document.getElementById("end").value;
    var travelMode = google.maps.DirectionsTravelMode.DRIVING
    //SET UP REQUEST FOR DRIVING INSTRUCTIONS
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

            // DISPLAY INFORMATION FOR EACH ROUTE
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
            // //WRITE OUT MID POINT COORDINATES
            // document.getElementById("midpoint").innerHTML = `
            //     <div class="card text-dark bg-light" style="max-width: 18rem;">
            //         <div class="card-header">Midpoint:</div>
            //         <div class="card-body">
            //             <p class="card-text">(${midpoint.lng.toFixed()}, ${midpoint.lat.toFixed()})</p>
            //         </div>
            //     </div>
            // `
            getRestaurauntInfo(midpoint);
        } else {
            alert("directions response " + status);
        }
        codeAddress(startLocation.address);
        codeAddress(endLocation.address);
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
    $("#total").html(`
        <div class="card text-dark bg-light mb-3" style="max-width: 18rem;">
            <div class="card-header">Total Distance:</div>
            <div class="card-body">
                <p class="card-text">${(totalDist * 0.621371).toFixed(2)} miles</p>
            </div>
        </div>
        <div class="card text-dark bg-light mb-3" style="max-width: 18rem;">
            <div class="card-header">Total Time:</div>
            <div class="card-body">
                <p class="card-text">${Math.round((totalTime / 60).toFixed(2))} minutes</p>
            </div>
        </div>
        <div class="card text-dark bg-light mb-3" style="max-width: 18rem;">
            <div class="card-header">Midpointz Saves You:</div>
            <div class="card-body">
                <p class="card-text text-success">${Math.round((((totalDist * 0.621371) / 2).toFixed(2)))} miles and ${Math.round(((totalTime / 60).toFixed(2) / 2))} minutes</p>
            </div>
        </div>
    `)
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

//DELETE ALL MARKERS BY REMOVING THEIR REFERENCE
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
function getRestaurauntInfo(location) {
    var pyrmont = new google.maps.LatLng(location.lat, location.lng);
    var request = {
        location: pyrmont,
        radius: ($("#diameter").val() * 1609.344),
        type: [$("#location").val()],
    };
    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, callback);
}

//SET UP MARKERS
function callback(results, status) {
    $('#contentCarousel').css('display', 'block');
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) {
            var place = results[i];
            var active = '';
            //CONTENT FOR PIN POINT
            let content = `
                <h3>${place.name}</h3>
            `;
            //CREATE VARIABLES FOR POPULATING SCROLLER
            let picture;
            let price;
            let rating;
            let peopleRating;
            let lat = place.geometry.location.lat();
            let lng = place.geometry.location.lng();
            let openOrClosed;

            //CHECK IF THIS IS THE FIRST ONE AND MAKE ACTIVE IF IT IS
            if (i == 0) {
                active = "active";
            } else {
                active = "";
            }
            //CHECK FOR IMAGE
            if (place.photos) {
                picture = `<img src="${place.photos[0].getUrl()}">`;
            } else {
                picture = '<img src="./images/no-image.png" alt="">';
            }
            //CHECK FOR PRICE
            if (place.price_level) {
                price = `(<span class="carousel-item_price">${createPrice(place.price_level)}</span>)`;
            } else {
                price = '';
            }
            //CHECK FOR RATING
            if (place.rating) {
                switch (true) {
                    case (place.rating > 4.5):
                        rating = `<div class="carousel-item_rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>`;
                        break;
                    case (place.rating > 4):
                        rating = `<div class="carousel-item_rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i></div>`;
                        break;
                    case (place.rating > 3.5):
                        rating = `<div class="carousel-item_rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 3):
                        rating = `<div class="carousel-item_rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 2.5):
                        rating = `<div class="carousel-item_rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 2):
                        rating = `<div class="carousel-item_rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 1.5):
                        rating = `<div class="carousel-item_rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 1):
                        rating = `<div class="carousel-item_rating"><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 0.5):
                        rating = `<div class="carousel-item_rating"><i class="fas fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 0):
                        rating = `<div class="carousel-item_rating"><i class="fas fa-star-half-alt"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    default:
                        rating = ``;
                        break;
                }
            } else {
                rating = '';
            }

            //CHECK FOR TOTAL PEOPLE RATING
            if (place.user_ratings_total) {
                peopleRating = `<div class="carousel-item_reviews">${place.user_ratings_total} Ratings</div>`
            } else {
                peopleRating = '';
            }
            //CHECK IF PLACE IS OPEN OR CLOSED
            if (place.opening_hours.open_now == true) {
                openOrClosed = `<div class="carousel-item_isopen"><span class="badge bg-success">Open</span></div>`;
            } else if (place.opening_hours.open_now == false) {
                openOrClosed = `<div class="carousel-item_isopen"><span class="badge bg-danger">Closed</span></div>`;
            } else {
                openOrClosed = ``;
            }
            // CHECK IF IT IS OPEN OR CLOSED
            $(`
                <div class="carousel-item ${active}">
                    <div class="carousel-item-container">
                        <div class="container">
                            <div class="row">
                                <div class="col-3">
                                    <div class="carousel-item_image">
                                        ${picture}
                                    </div>
                                </div>
                                <div class="col-6 pt-2 pb-3">
                                <div class="carousel-item_header">${place.name} ${price}</div>
                                    <div class="carousel-item_location">Location: ${place.vicinity}</div>
                                </div>
                                <div class="col-3 pt-2 pb-3">
                                    ${rating}
                                    ${peopleRating}
                                    ${openOrClosed}
                                    <div class="carousel-item_wrapper">
                                        <button onclick="locateOnMap(${lat}, ${lng})" type="button" class="btn btn-primary">
                                            <i class="fas fa-map-pin"></i>
                                        </button>
                                        <button onclick="openGoogleMapNav(${lat}, ${lng})" type="button" class="btn btn-primary">
                                            <i class="fas fa-road"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).appendTo('.carousel-inner');

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
function bindInfoWindow(marker, map, infowindow, html) {
    marker.addListener('click', function () {
        infowindow.setContent(html);
        infowindow.open(map, this);
    });
}

//CREATE PRICING
function createPrice(level) {
    if (level != "" && level != null) {
        let out = "";
        for (var x = 0; x < level; x++) {
            out += "$";
        }
        return out;
    } else {
        return "?";
    }
}

//PUT MARKER ON MAP OFF ADDRESS
function codeAddress(address) {
    geocoder.geocode({
        'address': address
    }, function (results, status) {
        var latLng = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
        };
        if (status == 'OK') {
            var marker = new google.maps.Marker({
                position: latLng,
                map: map
            });
            markers.push(marker);
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
}

//ZOOM IN ON THE LOCATION ON THE MAP
function locateOnMap(lat, lng) {
    const center = new google.maps.LatLng(lat, lng);
    map.panTo(center);
    map.setZoom(14);
}

//OPEN LOCATION IN GOOGLE MAPS
function openGoogleMapNav(lat, lng) {
    const url = `http://maps.google.com/maps?q=loc:${lat},${lng}&navigate=yes`;
    window.open(url, '_blank');
}