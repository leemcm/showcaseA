var express = require('express');
var multer = require('multer');
var sqlite3 = require('sqlite3').verbose();

var upload = multer({
  dest: 'public/img/upload'
});

var app = express();

app.use(express.static('public'));

app.use(upload);

var db = new sqlite3.Database("persistent.db");

app.set('view engine', 'ejs');

function insertTag(tag, cb) {
  db.run("INSERT INTO tags(tag) VALUES(?)", [tag], function(err) {
      if(err) {
        db.get("SELECT * FROM tags WHERE tag LIKE '%" + tag + "%'", function(err, iRow) {
          cb({'tag': tag, 'id': iRow.tagid});
        });
      }else{
        cb({'tag': tag, 'id': this.lastID});
      }
    });
}

app.post('/api/upload', function(req, res) {
  //req.body is where your form text will be
  var imagePath = req.files.image.name;
  var imageTitle = req.files.image.originalname;
  var imageDescription = req.body.imageDescription;
  var imageTag = req.body.imageTag;
  var imageTagSplit = imageTag.split(", ");
  console.log(imageTagSplit);
  db.run("INSERT INTO images(imagePath, imageTitle, imageDescription, imageDate) VALUES(?,?,?,DATE())", [imagePath, imageTitle, imageDescription], function(err, row) {
    if (err) {
      console.log(err);
    } else {
      var imgId = this.lastID;
      // console.log(imgId);
      for (var index = 0; index < imageTagSplit.length; index++) {
        insertTag(imageTagSplit[index], function(tag) {
          db.run("INSERT INTO links (tagid, imageid) VALUES (?,?)", [tag.id, imgId], function(err, lrow) {
            if (err) {
              console.log(err);
            } else {};
          });
        });
      };
    };
  });
  res.redirect("/");
});


//trying out deleting files

app.get('/api/deleteFile', function (req, res) {
  var imageid = req.query.imageid;
  console.log ('deleting file' + imageid);
  console.log('----');
  db.serialize(function() {
    db.run("DELETE FROM images WHERE imageid=?", imageid, function(err, row) {
      if (err){
        console.log("DELETE IMAGE ERROR");
        console.log(err);
      }else{
        db.all("SELECT * FROM links ORDER BY imageid", function(err,row){
          if (err){
            console.log("SELECT LINKS ERROR");
            console.log(err);
          }else{
            var matchingTags = [];
            console.log(row);
            for (var i = 0; i < row.length; i++) {
              var t = row[i];
              //add to matching tags if imageid matches and remove from row
              if(t.imageid == imageid) {
                matchingTags.push(t.tagid);
                // row.splice(i, 1);
                delete row[i];
              }
            }
            console.log(row);
            for (var i = 0; i < matchingTags.length; i++) {
              //check if id exists in row and remove from matching tags if it does
              for (var j = 0; j < row.length; j++) {
                if(matchingTags[i] !== undefined) {
                  if(row[j] !== undefined && row[j].tagid === matchingTags[i]) {
                    matchingTags.splice(matchingTags.indexOf(row[j].tagid), 1);
                  }
                }
              }
            }
            console.log(matchingTags);
            console.log('file ' + imageid + ' deleted');
            db.run("DELETE FROM links where imageid=?", imageid, function(err) {
              if(err) console.log(err);
              var prepped = db.prepare("DELETE FROM tags WHERE tagid=?");
              for (var i = 0; i < matchingTags.length; i++) {
                if(matchingTags[i] !== undefined)
                  prepped.run(matchingTags[i]);
              }
              prepped.finalize(function() {
                res.json("okay");
              });
            });
          }
        })
      };
    });
  });
});

app.get('/search', function(req, res){
   var imgs = [];
    var tagArray = [];
  var tagSearch = req.query.tagSeek;
  console.log(tagSearch);
  db.serialize(function(){
    db.each("SELECT DISTINCT t.tag, t.tagid, i.imageid, i.imageTitle, i.imageDescription, i.imageDate, i.imagePath FROM tags t LEFT JOIN links l ON t.tagid = l.tagid LEFT JOIN images i ON l.imageid = i.imageid WHERE t.tag LIKE '%" + tagSearch + "%'", function(err, row){
      if (err){
        console.log(err);
      }else{
        // console.log(row);
        imgs.push(row);
      }
    })
    db.each("SELECT * FROM tags", function( err, row){
          console.log(row);
          if (err){
            console.log(err);
          } else {
            tagArray.push(row.tag);
          }
          // console.log("tag array " + tagArray);
        }, function() {
        res.render('index', {'imgsres': imgs, 'tagArray': tagArray});
    });
  });
});


app.get('/', function(req, res) {
  imgs = [];
  imgsres = [];
  tagArray = [];
  db.serialize(function() {
    db.each("SELECT DISTINCT i.imageid, i.imageTitle, i.imageDescription, i.imagePath, i.imageDate, t.tag FROM images i LEFT JOIN links l ON i.imageid = l.imageid LEFT JOIN tags t ON l.tagid = t.tagid", function(err, row) {
      if (err) {
        console.log(err);
      } else {
        // console.log("image pushed");
        imgs.push(row);
      }

    }, function() {
      //  console.log(imgs);
//        return;
      if (imgs.length == 0) {
        console.log("imgs empty");
      } else {
        imgsres.push(imgs[0]);
        imgs[0].tag = [imgs[0].tag];

        for (var i = 0; i < imgs.length; i++) {
          var found = false;
          for (var j = 0; j < imgsres.length; j++) {
            if (imgsres[j].imageid === imgs[i].imageid) {
              found = true;
              if (typeof(imgs[i].tag) !== 'object') {
                imgsres[j].tag.push(imgs[i].tag);
              }
            }
          };
          if (found === false) {
            imgs[i].tag = [imgs[i].tag];
            imgsres.push(imgs[i]);
            // console.log(imgsres);
          }
        }
      }
        // console.log(imgsres);
        db.each("SELECT * FROM tags", function( err, row){
          // console.log(row);
          if (err){
            console.log(err);
          } else {
            tagArray.push(row.tag);
          }
          // console.log("tag array " + tagArray);
        }, function(){
          res.render('index', JSON.stringify(imgsres, tagArray));
          // console.log("json stringify" + JSON.stringify(tagArray));
        })
        var tagsFilter = [];

        //loop through image array and add tag if doesnt exist

    });
  });
});

var server = app.listen(8081, function() {
  db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS images(imageid INTEGER PRIMARY KEY NOT NULL, imagePath TEXT NOT NULL, imageTitle TEXT NOT NULL, imageDescription TEXT NOT NULL, imageDate TEXT NOT NULL)", function(err) {
      if (err) {
        console.log(err);
      }
    });
    db.run("CREATE TABLE IF NOT EXISTS tags(tagid INTEGER PRIMARY KEY NOT NULL, tag TEXT NOT NULL UNIQUE)", function(err) {
      if (err) {
        console.log(err);
      }
    });
    db.run("CREATE TABLE IF NOT EXISTS links(tagid INTEGER NOT NULL, imageid INTEGER NOT NULL)", function(err) {
      if (err) {
        console.log(err);
      }
    })
  });
  var host = server.address().address;
  var port = server.address().port;
  console.log("Example app listening at http://%s:%s", host, port);
})
