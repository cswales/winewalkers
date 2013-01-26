/*
 * some simple transformation math.
 * Create a translation + rotation + scale 2d transformation matrix from
 * two sets of points; apply transformation matrix
 * to a point.
 *
 * CSW, Medea Software 2012
 */

var twod_xform = new Object();

// adding scale and scaleT - the ratio of the units of x and y in the
// original and scaled points.
// This is to handle conversions from degrees latitude and longitude into
// pixels (aka 'meters'), since the length of a degree of longitude depends
// on the latitude of the position.
twod_xform.createTransform = function(p1, p2, p1t, p2t, scaleX, scaleXT)
{
	// to find the rotation, look at the vector joining the two points. The 
	// change in its orientation between the two coordinate systems will be
	// the rotation
	var v1 = {x:(p1.x-p2.x) * scaleX, y:p1.y-p2.y};
	var v2 = {x:(p1t.x - p2t.x) * scaleXT, y:p1t.y - p2t.y};
	var r1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
	var r2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);
	
	var scale = r2/r1;
	console.log("p1.x is " + p1.x + " scaleXT is " + scaleXT);
	console.log(" scale is " + scale + " inv scale is " + 1/scale);
	// Latitude and longitude have inherently different scales. fuck.
	
	// theta is the change in the orientation of the vector. Note that acos is really
	// a multi-valued function, so we have to use some additional information to give us
	// the real answer
	var theta1 = Math.acos(v1.x/r1);
	if (v1.y < 0) {
		console.log("switching sign of theta1");
		theta1 = -theta1;
	}
//	var theta1degrees = theta1*180/Math.PI;
//	console.log("theta1 is " + theta1degrees);
	
	var theta2 = Math.acos(v2.x/r2);
	if (v2.y < 0) {
		console.log("switching sign of theta2");
		theta2 = -theta2;
	}
	
//	var theta2degrees = theta2*180/Math.PI;
//	console.log("theta2 is " + theta2degrees);

//	var theta = Math.acos(v2.x/r2) - Math.acos(v1.x/r1);
//	console.log(" theta(1) is " + theta*180/Math.PI);
	// unfortunately, acos(theta) = acos(-theta). Which one is it? Hmm. The above equation
	// can't be right then, can it? There are four valid answers to the equation.
	
	var theta = theta2 - theta1;
	console.log(" theta is " + theta*180/Math.PI);

		
	// tx and ty are the transformations in x and y respectively,
	// given the scale and the rotation
	var tx =  p1t.x - scale/scaleXT * ( p1.x * scaleX * Math.cos(theta) - p1.y * Math.sin(theta));
	var ty =  p1t.y - scale         * ( p1.x * scaleX * Math.sin(theta) + p1.y * Math.cos(theta));
//	console.log("tx: " + tx + ", ty: " + ty);

	// now return the matrix
	var row1 = [ scale * scaleX/scaleXT * Math.cos(theta), -scale/scaleXT * Math.sin(theta), tx];
	var row2 = [ scale * scaleX * Math.sin(theta),  scale * Math.cos(theta), ty];
	
	var matrix = [row1, row2];
	return matrix;
}

// apply transform to a point
twod_xform.transform = function(v1, m)
{
	var x = v1.x * m[0][0] + v1.y * m[0][1] + m[0][2];
	var y = v1.x * m[1][0] + v1.y * m[1][1] + m[1][2];
	
	return {x:x,y:y};
}

