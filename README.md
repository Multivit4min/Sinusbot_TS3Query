# Sinusbot TS3Query
This Library allows you to connect via the https://sinusbot.com Scripting Engine to any TeamSpeak Query Interface

I used some functions and Ideas from the NodeJS Library https://github.com/gwTumm/node-teamspeak as help.
Dont forget to require the "net" module in your config.ini
The usage is nearly the same as the above mentioned Library

Here is a simple example:

```JavaScript
var engine = require("engine") 
var ts3 = new TS3Query({ host: "127.0.0.1", port: 9987})

ts3.on("notifycliententerview", function(event){
  engine.log(JSON.stringify(event))
})
  
ts3.on("connect", function() {
  engine.log("CONNECTED!")
  ts3.send("login", {client_login_name: "queryusername", client_login_password: "querypassword"}, function(err) {
    if (err) return engine.log(JSON.stringify(err))
    ts3.send("use", {port: 9987}, function(err) {
      if (err) return engine.log(JSON.stringify(err))
      ts3.send("whoami", function(err, res) {
        if (err) return engine.log(JSON.stringify(err))
        engine.log(JSON.stringify(res))
      })
      ts3.send("servernotifyregister", {event: "server"}, function(err){
        if (err) return engine.log(JSON.stringify(err))
      })
    })
  })
})
```


__Valid events are:__<br/>
connect -> gets fired when the connection to the TCP Socket was successfull<br/>
close -> gets fired when the connection to the TeamSpeak gets closed<br/>
error<br/>
notify<ts3event> -> gets called when you receive a TeamSpeak Event<br/>
