/* Showing Mongoose's "Populated" Method
 * =============================================== */

// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
// var logger = require("morgan");
var mongoose = require("mongoose");
// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;


// Initialize Express
var app = express();
var PORT = process.env.PORT || 3000;

// Use morgan and body parser with our app
// app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

// Set Handlebars.
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Make public a static dir
// app.use(express.static("public"));
app.use('/public', express.static(__dirname + "/public"));

// Database configuration with mongoose
// mongoose.connect("mongodb://localhost/sdnews");
mongoose.connect("mongodb://heroku_wpf1hdvq:e3gc5jogq3kvf3o05pp0okgc9g@ds161860.mlab.com:61860/heroku_wpf1hdvq");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});


// Routes
// ======

var link = "http://www.sandiegouniontribune.com";

// This will get the articles we scraped from the mongoDB
app.get("/", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({ "saved": false }, function(error, doc) {
    var hbsObject = {
      topics: doc,
      title: "Mongo Scraper",
      subtitle: "San Diego Union Tribune Edition"
    };
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      // console.log(doc);
      res.render("index", hbsObject);
    }
  });
});

app.get("/saved-articles", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({ "saved": true }, function(error, doc) {
    var hbsObject = {
      topics: doc,
      title: "Saved Articles",
      subtitle: "Your Saved Articles"
    };
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      // console.log(doc);
      res.render("saved", hbsObject);
    }
  });
});

// A GET request to scrape the echojs website
app.get("/scrape", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    else {
      // First, we grab the body of the html with request
      request(link, function(error, response, html) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);
        let count = 0;

        // Now, we grab every h2 within an article tag, and do the following:
        $("h3.trb_outfit_relatedListTitle").each(function(i, element) {

          let isPresent = false;

          for(var i = 0; i < doc.length; i++) {
            if(doc[i].title === $(this).children("a").text()) {
              isPresent = true;
              // console.log("title present");
              break;
            }
          }
          if(!isPresent) {
            // Save an empty result object
            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this).children("a").text();
            result.link = link + $(this).children("a").attr("href");

            // Using our Article model, create a new entry
            // This effectively passes the result object to the entry (and the title and link)
            var entry = new Article(result);

            // Now, save that entry to the db
            entry.save(function(err, doc) {
              // Log any errors
              if (err) {
                console.log(err);
              }
              // Or log the doc
              else {
                // console.log(doc);
              }
            });
            count++;
          };
        });
        // send count to browser
        res.json({ "count": count });
      });
    };
  });
});

// This will get the articles we scraped from the mongoDB
app.get("/saved-articles/notes/:id", function(req, res) {
  // Grab every doc in the Articles array
  Article.findOne({ "_id": mongoose.Types.ObjectId(req.params.id) })
    // ..and populate all of the notes associated with it
    .populate("notes")
    // now, execute our query
    .exec(function(error, doc) {
      console.log(doc.notes);
      var hbsObject = {
        notes: doc.notes
      };
      console.log(hbsObject);
      // Log any errors
      if (error) {
        console.log(error);
      }
      // Or send the doc to the browser as a json object
      else {
        res.render("notes", hbsObject);
      }
  });
});

// // Grab an article by it's ObjectId
// app.get("/articles/:id", function(req, res) {
//   // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
//   Article.findOne({ "_id": req.params.id })
//   // ..and populate all of the notes associated with it
//   .populate("note")
//   // now, execute our query
//   .exec(function(error, doc) {
//     // Log any errors
//     if (error) {
//       console.log(error);
//     }
//     // Otherwise, send the doc to the browser as a json object
//     else {
//       res.json(doc);
//     }
//   });
// });

// Create a new note or replace an existing note
app.post("/save-note/:id", function(req, res) {
  console.log("post note");
  // Create a new note and pass the req.body to the entry
  var newNote = new Note(req.body);

  // And save the new note the db
  newNote.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      console.log("save note");
      console.log(doc._id);
      // Use the article id to find and update it's note
      Article.findOneAndUpdate({ "_id": req.params.id }, { $push: { "notes": doc._id } })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.redirect("/saved-articles");
        }
      });
    };
  });
});

app.post("/remove-note/:id", function(req, res) {

  Article.find({})
  // Remove the note the db
  Note.deleteOne( {"_id": req.params.note_id}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's note
      Article.findOneAndUpdate({ "_id": req.params.id }, { $pull: { "note": doc.note_id } })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    };
  });
});

// save article
app.post("/save/:id", function(req, res) {
  Article.update({ "_id": req.params.id },
    {$set: { "saved": true }}, function(error) {
      // Log any errors
      if (error) {
        console.log(error);
      }
      else {
        // console.log("success");
        res.redirect("/");
      }
  });
});

// delete article from saved
app.post("/saved/:id", function(req, res) {
  Article.update({ "_id": req.params.id },
    {$set: { "saved": false }}, function(error) {
      // Log any errors
      if (error) {
        console.log(error);
      }
      else {
        // console.log("success");
        res.redirect("/saved-articles");
      }
  });
});

// Listen on port 
app.listen(PORT, function() {
  console.log("App listening on PORT " + PORT);
});
