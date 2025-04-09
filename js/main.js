//Ethan Westerkamp

(function(){

var attrArray = [ "Real GDP","Utilized Agriculture","Renewable Energy","Protected Area","CO2"];
var expressed = attrArray[0];
//execute script when window is loaded

var chartWidth = window.innerWidth * 0.425,
    chartHeight = 600;
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 1,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
.range([chartHeight, 0])
.domain([-.1, 25]);

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
        createDropdown(csvData)
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


function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //OPTIONS BLOCKS FROM EXAMPLE 1.1 LINES 8-19
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

//dropdown change event handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var countries = d3.selectAll(".Abbrev")
        .transition()
        .duration(300)
        .style("fill", function(d){            
            var value = d.properties[expressed];            
            if(value) {                
                return colorScale(value);            
            } else {                
                return "#ccc";            
            }    
        });
    //Sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //Sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
       
        
    updateChart(bars, csvData.length, colorScale);
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
    var specific_countries = map.selectAll(".Abbrev ")
        .data(eu_countries)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "Abbrev " + d.properties.ADMIN
        })
        .attr("d", path)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
                return colorScale(value);
            } 
            else {
                return "#ccc";
            }
            
        })
        .on("mouseover", function(event, d){
            highlight(d.properties);
        })
        .on("mouseout", function(event, d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);
    var desc = specific_countries.append("desc")
        .text('{"stroke": "#000", "stroke-width": "1px"}');
   
};

function setChart(csvData, colorScale){
    //chart frame dimensions
    

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //create a scale to size bars proportionally to frame and for axis
  

    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.ADMIN;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", function(event, d){
            highlight(d);
        })
        .on("mouseout", function(event, d){
            dehighlight(d);
        })
        .on("mousemove", moveLabel);
    var desc = bars.append("desc")
        .text('{"stroke": "#444", "stroke-width": "1px"}');

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Percent of " + expressed + " in each country");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    updateChart(bars, csvData.length, colorScale);
};

function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){            
            var value = d[expressed];            
            if(value) {                
                return colorScale(value);            
            } else {                
                return "#ccc";            
            }    
        });
        var chartTitle = d3.select(".chartTitle")
            .text("Percentage of " + expressed + " in each country");
};

function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.ADMIN)
        .style("stroke", "blue")
        .style("stroke-width", "2");
    setLabel(props)
};

function dehighlight(props){
    var selected = d3.selectAll("." + props.ADMIN)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    d3.select(".infolabel")
    .remove();
};

function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.ADMIN + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.ADMIN);
    
};

function moveLabel(){
    //use coordinates of mousemove event to set label coordinates
    var x = event.clientX + 10,
        y = event.clientY - 75;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};


})();




