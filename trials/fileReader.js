var fs = require('fs')
var es = require('event-stream')
var readline = require('readline')
var EventEmitter = require('events')
var readlineEmitter = new EventEmitter()
var qr = require('./queryResolver')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter filename:', function(filename){
      console.log("Entered fileName:", filename)
      fs.exists(filename, function(present){
          if (present){
              console.log("Given filename is present")
              var s = fs.createReadStream(filename)
                        .pipe(es.split())
                        .pipe(es.mapSync(function(line){
                            readlineEmitter.emit('avail-line', line)
                        }))
                        .on('error', function(error){
                            console.log("Error occured while reading")
                        })
                        .on('end', function(){
                            console.log("Read file Ended")
                        })
          } else {
              console.log("File is not present")
          }
      })
      rl.close()
  });

readlineEmitter.on('avail-line', function(readLine){
    qr.evalExpression()

})