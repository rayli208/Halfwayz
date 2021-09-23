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
//DIRECTIONS SERVICE OBJECT
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
            getVenueInfo(midpoint);
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

    //THROW IN SOME CARDS WITH FUN FACTS
    $("#total").html(`
        <div class="card text-dark bg-light mb-3 mt-2 mt-md-0 mx-2 mx-md-0" style="max-width: 18rem;">
            <div class="card-header">Total Distance/Time:</div>
            <div class="card-body">
                <p class="card-text">${Math.round((totalDist * 0.621371).toFixed(2))} miles</p>
                <p class="card-text">${Math.round((totalTime / 60).toFixed(2))} minutes</p>
            </div>
        </div>
        <div class="card text-dark bg-light mb-3 mt-2 mt-md-0 mx-2 mx-md-0" style="max-width: 18rem;">
            <div class="card-header">Midpointz Saves You:</div>
            <div class="card-body">
            <p class="card-text text-success">${Math.round((((totalDist * 0.621371) / 2).toFixed(2)))} miles</p>
            <p class="card-text text-success">${Math.round(((totalTime / 60).toFixed(2) / 2))} minutes</p>
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
function getVenueInfo(location) {
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
            let placeId = place.place_id;

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

            // CHECK IF IT IS OPEN OR CLOSED
            $(`
                <div class="carousel-item ${active}">
                    <div class="carousel-item-container">
                        <div class="container">
                            <div class="row">
                                <div class="col-12 col-sm-3">
                                    <div class="carousel-item_image">
                                        ${picture}
                                    </div>
                                </div>
                                <div class="col-12 col-sm-6 pt-2 pb-sm-3">
                                <div class="carousel-item_header">${place.name} ${price}</div>
                                    <div class="carousel-item_location">Location: ${place.vicinity}</div>
                                </div>
                                <div class="col-12 col-sm-3 pt-2 pb-3">
                                    ${rating}
                                    ${peopleRating}
                                    <div class="carousel-item_wrapper">
                                        <button onclick="showInfoModal('${placeId}')" type="button" class="btn btn-primary">
                                            <i class="fas fa-info-circle"></i>
                                        </button>
                                        <button onclick="locateOnMap(${lat}, ${lng})" type="button" class="btn btn-primary">
                                            <i class="fas fa-map-pin"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).appendTo('.carousel-inner-main');

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

//SHOW MORE INFO
function showInfoModal(placeId) {

    var service = new google.maps.places.PlacesService(map);

    service.getDetails({
        placeId: placeId
    }, function (place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            console.log(place);
            //CLEAR OUT MODAL
            $('#infoModal').empty();
            //CREATE VARIABLES FOR MODAL
            let name;
            let address;
            let phone;
            let rating;
            let mapsLocation;
            let website;
            let photos = [];
            let reviews = [];
            let types = [];
            let hours = [];
            let isOpen;

            //CHECK FOR NAME
            if (place.name) {
                name = `<h5 class="info-modal-image-container-header shadow-lg" id="infoModalLabel">${place.name}</h5>`;
            } else {
                name = '';
            }
            //CHECK FOR ADDRESS
            if (place.formatted_address) {
                address = `<div class="info-modal-image-container-sub-header">
                                <h6>${place.formatted_address}</h6>
                            </div>`;
            } else {
                address = '';
            }
            //CHECK FOR PHONE
            if (place.international_phone_number) {
                phone = `<a type="button" class="btn btn-outline-primary" href="tel:${place.international_phone_number}">
                            <i class="fas fa-phone-volume"></i>
                        </a>`;
            } else {
                phone = '';
            }
            //CHECK FOR MAPS LOCATION
            if (place.url) {
                mapsLocation = `<a type="button" class="btn btn-outline-primary" target="_blank" href="${place.url}">
                                    <i class="fas fa-map-marked-alt"></i>
                                </a>`;
            } else {
                mapsLocation = '';
            }
            //CHECK FOR WEBSITE
            if (place.website) {
                website = `<a type="button" class="btn btn-outline-primary" target="_blank" href="${place.website}">
                                <i class="fab fa-safari"></i>
                            </a>`;
            } else {
                website = '';
            }
            //CHECK FOR HOURS
            if (place.opening_hours) {
                console.log(place.opening_hours.isOpen())
                for (var i = 0; i < place.opening_hours.weekday_text.length; i++) {
                    hours += `<li class="list-group-item">${place.opening_hours.weekday_text[i]}</li>`;
                }

                if (place.opening_hours.isOpen() == true) {
                    isOpen = `<span class="badge rounded-pill bg-success">Open</span>`;
                } else if (place.opening_hours.isOpen() == false) {
                    isOpen = `<span class="badge rounded-pill bg-danger">Closed</span>`;
                } else {
                    isOpen = ``;
                }
            }
            //CHECK FOR RATING
            if (place.rating) {
                switch (true) {
                    case (place.rating > 4.5):
                        rating = `<div class="carousel-item_rating info-modal-image-container-rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>`;
                        break;
                    case (place.rating > 4):
                        rating = `<div class="carousel-item_rating info-modal-image-container-rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i></div>`;
                        break;
                    case (place.rating > 3.5):
                        rating = `<div class="carousel-item_rating info-modal-image-container-rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 3):
                        rating = `<div class="carousel-item_rating info-modal-image-container-rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 2.5):
                        rating = `<div class="carousel-item_rating info-modal-image-container-rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 2):
                        rating = `<div class="carousel-item_rating info-modal-image-container-rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 1.5):
                        rating = `<div class="carousel-item_rating info-modal-image-container-rating"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 1):
                        rating = `<div class="carousel-item_rating info-modal-image-container-rating"><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 0.5):
                        rating = `<div class="carousel-item_rating info-modal-image-container-rating"><i class="fas fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    case (place.rating > 0):
                        rating = `<div class="carousel-item_rating info-modal-image-container-rating"><i class="fas fa-star-half-alt"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i></div>`;
                        break;
                    default:
                        rating = ``;
                        break;
                }
            } else {
                rating = '';
            }
            //CHECK FOR PHOTOS
            if (place.photos) {
                for (var i = 0; i < place.photos.length; i++) {
                    if (i == 0) {
                        photos += `<div class="carousel-item active">
                                        <img src="${place.photos[i].getUrl()}" class="d-block h-100 w-100" alt="location image">
                                    </div>`
                    } else {
                        photos += `<div class="carousel-item">
                                        <img src="${place.photos[i].getUrl()}" class="d-block h-100 w-100" alt="location image">
                                    </div>`
                    }
                }
            } else {
                photos = '';
            }
            //CHECK FOR REVIEWS
            if (place.reviews) {
                for (var i = 0; i < place.reviews.length; i++) {
                    if (i == 0) {
                        reviews += `<div class="carousel-item active">
                                        <div class="carousel-item-container-modal">
                                            <div class="carousel-item-container-modal-body">
                                                <h5 class="card-title">
                                                    <img src="${place.reviews[i].profile_photo_url}"
                                                        class="carousel-item-container-modal_image" alt="...">
                                                    <span class="carousel-item-container-header">${place.reviews[i].author_name}</span>
                                                </h5>
                                                <div class="carousel-item-container-sub">"${place.reviews[i].text}"</div>
                                                    <div class="carousel-item-container-date">- ${place.reviews[i].relative_time_description}</div>
                                                    <div class="carousel-item-container-rating">${place.reviews[i].rating}/5</div>                                            
                                                </div>
                                        </div>
                                    </div>`
                    } else {
                        reviews += `<div class="carousel-item">
                                        <div class="carousel-item-container-modal">
                                            <div class="carousel-item-container-modal-body">
                                                <h5 class="card-title">
                                                    <img src="${place.reviews[i].profile_photo_url}"
                                                        class="carousel-item-container-modal_image" alt="...">
                                                    <span class="carousel-item-container-header">${place.reviews[i].author_name}</span>
                                                </h5>
                                                <div class="carousel-item-container-sub">"${place.reviews[i].text}"</div>
                                                    <div class="carousel-item-container-date">- ${place.reviews[i].relative_time_description}</div>
                                                    <div class="carousel-item-container-rating">${place.reviews[i].rating}/5</div>                                            
                                                </div>
                                        </div>
                                    </div>`
                    }
                }
            }
            //CHECK FOR TYPES
            if (place.types) {
                for (var i = 0; i < place.types.length; i++) {
                    types += `<span class="badge rounded-pill bg-pink text-light mx-1">${(place.types[i].split('_').join(' '))}</span>`;
                }
            } else {
                types = '';
            }

            //POPULATE MODAL
            $(`
                <div class="modal-dialog">
                <div class="modal-content">
                    <div class="info-modal-image-container">
                        ${name}
                        <button type="button" class="btn-close info-modal-image-container-close" data-bs-dismiss="modal"
                            aria-label="Close"></button>
                        ${address}
                        ${rating}
                        <div id="modalImageSlideCarousel" class="carousel slide carousel-fade" data-bs-ride="carousel">
                            <div class="carousel-inner">
                                ${photos}
                            </div>
                        </div>
                    </div>
                    <div class="modal-body mb-5">
                        <button class="btn btn-primary schedule-collapse-button" type="button" data-bs-toggle="collapse"
                            data-bs-target="#scheduleCollapse" aria-expanded="false" aria-controls="scheduleCollapse">
                            <span>Hours of Operation</span>
                            ${isOpen}
                        </button>
                        <div class="collapse" id="scheduleCollapse">
                            <ul class="list-group">
                                ${hours}
                            </ul>
                        </div>
                        <div id="reviewCarousel" class="carousel slide py-3" data-bs-interval="false">
                            <div class="carousel-inner">
                                ${reviews}
                            </div>
                            <button class="carousel-control-prev" type="button" data-bs-target="#reviewCarousel"
                                data-bs-slide="prev">
                                <span><i class="fa fa-angle-left carousel-control-icon-mini" aria-hidden="true"></i></span>
                                <span class="visually-hidden">Previous</span>
                            </button>
                            <button class="carousel-control-next" type="button" data-bs-target="#reviewCarousel"
                                data-bs-slide="next">
                                <span><i class="fa fa-angle-right carousel-control-icon-mini" aria-hidden="true"></i></span>
                                <span class="visually-hidden">Next</span>
                            </button>
                        </div>
                        <div class="mt-3">
                            <span>Types:</span>
                            ${types}
                        </div>
                    </div>
                    <div class="info-modal-buttons">
                        ${phone}
                        ${mapsLocation}
                        ${website}
                    </div>
                </div>
            </div>
         `).appendTo('#infoModal');
            //SHOW MODAL
            $('#infoModal').modal('show');
            //GET AUTO SCROLLER TO TRIGGER
            $('#modalImageSlideCarousel').carousel({
                interval: 3000,
                cycle: true
            });
        }
    });
}

// register ServiceWorker

// does the browser support service workers?
if ('serviceWorker' in navigator) {

    // Defer service worker installation until the page completes loading
    navigator.serviceWorker.register('sw.js')
        .then(function (registration) {
        console.log('Service Worker Registered');
        })
        .catch(function (error) {
            // display an error message
            let msg = `Service Worker Error (${error})`;
            console.error(msg);
        });
}
else {
    // happens when the app isn't served over a TLS connection (HTTPS)
    // or if the browser doesn't support service workers
    console.warn('Service Worker not available');
}