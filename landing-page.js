$(document).ready(function () {
	
	$('.landing-page .selection-section').on('click',function () {
		var $this=$(this);
		$destination = $this.data("dest");
		window.location.href = "./edit.html#" + $destination;
	});
	
});