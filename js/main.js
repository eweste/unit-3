//Ethan Westerkamp

(function(){

var attrArray = ["protect_area", "real_gdp", "uaa", "renew_nrg", "protect_area", "CO2"];
var expressed = attrArray[0];
//execute script when window is loaded

window.onload = setMap();

    //set up choropleth map
function setMap() {

    //map frame dimensions
    var width = window.innerWidth *0.5,
    height = 600;    

    var map = d3.select("body")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);

    var projection = d3.geoAlbers()
        .center([10, 46.2])
        .rotate([-6, -7])
        .parallels([45, 60])
        .scale(900)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];

    promises.push(d3.csv("data/aggregatedata.csv")); //load attributes from csv    
    promises.push(d3.json("data/eu_region.topojson")); //load background spatial data    
    promises.push(d3.json("data/EU_area_countries.topojson")); //load choropleth spatial data 

    Promise.all(promises).then(callback);

    function callback(data) {

        

        var csvData = data[0],
            europe_region = data[1],
            eu_states = data[2];

        setGraticulte(map, path);

        var region = topojson.feature(europe_region, europe_region.objects.eu_region);
        var eu_countries = topojson.feature(eu_states, eu_states.objects.EU_area_countries).features;

        

        


        var map_region = map.append("path")
            .datum(region)
            .attr("class", "regions")
            .attr("d", path);    

        eu_countries = joinData(eu_countries, csvData);
        
        //create the color scale
        var colorScale = makeColorScale(csvData);

        setEnumerationUnits(eu_countries, map, path, colorScale);
        
        setChart(csvData, colorScale);
        console.log(csvData);
        console.log(eu_countries);
    }
    };

function makeColorScale(data){
    var colorClasses = [
        "#ffffcc",
        "#c2e699",
        "#78c679",
        "#31a354",
        "#006837"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build two-value array of minimum and maximum expressed attribute values
    var minmax = [
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];
    //assign two-value array as scale domain
    colorScale.domain(minmax);

    return colorScale;
};




function setGraticulte(map, path) {
    var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule
        
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
};

function joinData(eu_countries, csvData) {
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.ABBREV; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<eu_countries.length; a++){

            var geojsonProps = eu_countries[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.Abbrev; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };
    return eu_countries
};

function setEnumerationUnits(eu_countries, map, path, colorScale){
    var specific_countries = map.selectAll()
            .data(eu_countries)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "ADMIN " + d.properties.ADMIN
            })
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
            })
};

function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 600;

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    var yScale = d3.scaleLinear()
    .range([0, chartHeight])
    .domain([0, 105]);

    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.renew_nrg;
        })
        .attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length);
        })
        .attr("height", function(d){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

    var numbers = chart.selectAll(".numbers")
    .data(csvData)
    .enter()
    .append("text")
    .sort(function(a, b){
        return a[expressed]-b[expressed]
    })
    .attr("class", function(d){
        return "numbers " + d.renew_nrg;
    })
    .attr("text-anchor", "middle")
    .attr("x", function(d, i){
        var fraction = chartWidth / csvData.length;
        return i * fraction + (fraction - 1) / 2;
    })
    .attr("y", function(d){
        return chartHeight - yScale(parseFloat(d[expressed])) + 15;
    })
    .text(function(d){
        return d[expressed];
    });

    var chartTitle = chart.append("text")
    .attr("x", 20)
    .attr("y", 40)
    .attr("class", "chartTitle")
    .text("Percentage of protected natural areas in each country");

};


})();




