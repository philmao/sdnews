
$("#scrape-btn").on("click", function() {
  // Grab the articles as a json
  $.getJSON("/scrape", function(data) {
    console.log(data.count);
    if(data.count) {
      alert("Added " + data.count + " new articles!");
    }
    else {
      alert("Added no new articles!");
    }
  });
});
