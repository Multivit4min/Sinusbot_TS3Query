function TS3Query(config) {
	var self = this
	self.queue = []
	self.events = {}
	self.data = ""
	self.ignorelines = 2
	self.config = {
		host: config.host || "127.0.0.1",
		port: config.port || 10011
	}

	self.conn = net.connect({host: self.config.host, port: self.config.port}, function(err) {
		self.triggerEvents("connect")
	})

	self.escape = function(s) {
		var s = String(s)
		s = s.replace(/\\/g, "\\\\")
		s = s.replace(/\//g, "\\/")
		s = s.replace(/\|/g, "\\p")
		s = s.replace(/\n/g, "\\n")
		s = s.replace(/\r/g, "\\r")
		s = s.replace(/\t/g, "\\t")
		s = s.replace(/\v/g, "\\v")
		s = s.replace(/\f/g, "\\f")
		s = s.replace(/ /g,  "\\s")
		return s
	}

	self.unescape = function(s) {
		s = String(s)
		s = s.replace(/\\s/g,  " ")
		s = s.replace(/\\p/g,  "|")
		s = s.replace(/\\n/g,  "\n")
		s = s.replace(/\\f/g,  "\f")
		s = s.replace(/\\r/g,  "\r")
		s = s.replace(/\\t/g,  "\t")
		s = s.replace(/\\v/g,  "\v")
		s = s.replace(/\\\//g, "\/")
		s = s.replace(/\\\\/g, "\\")
		return s
	}

	self.conn.on("error", function(err) {
		self.triggerEvents("error", err)
	})

	self.conn.on("close", function() {
		self.triggerEvents("close", err)
	})

	self.triggerEvents = function(name, data) {
		if (name in self.events) {
			for (var cb in self.events[name]) {
				setTimeout(self.events[name][cb].bind(self, data), 1)
			}
		}
	}

	self.conn.on("data", function(bytes) {
		self.data += bytes.toString()
		while(self.data.indexOf("\n\r") >= 0) {
			self.receiveLine(self.data.slice(0, self.data.indexOf("\n\r")))
			self.data = self.data.substr(self.data.indexOf("\n\r")+2)
		}
	})

	self.receiveLine = function(line) {
		if (self.ignorelines > 0) return self.ignorelines--
		if (line.indexOf("error") == 0) {
			var res = self.parseResponse(line)
			if (res.id === 0) {
				self.queue[0].cb(false, self.queue[0].data)
			} else {
				delete res.error
				self.queue[0].cb(res, self.queue[0].data)
			}
			self.queue.shift()
			if (self.queue.length > 0) self.conn.write(self.buildCommand(self.queue[0]))
		} else if (line.indexOf("notify") == 0) {
			self.triggerEvents(line.substr(0, line.indexOf(" ")), self.parseResponse(line))
		} else {
			self.queue[0].data = self.parseResponse(line)
		}
	}

	self.parseResponse = function(s){
		var records = s.split("|")
		var response = records.map(function(k){
			var args = k.split(" ")
			var thisrec = {}
			args.forEach(function(v){
				if(v.indexOf("=") > -1){
					var key = self.unescape(v.substr(0, v.indexOf("=")))
					var value = self.unescape(v.substr(v.indexOf("=")+1))
					if(parseInt(value, 10) == value) value = parseInt(value, 10)
					thisrec[key] = value
				} else {
					thisrec[v] = ""
				}
			})
			return thisrec
		})
		if(response.length === 0){
			response = null
		} else if(response.length === 1){
			response = response.shift()
		}
		return response
	}

	self.addQueue = function(query) {
		self.queue.push(query)
		if (self.queue.length == 1) self.conn.write(self.buildCommand(query))
	}

	self.buildCommand = function(query) {
		var cmd = query.cmd
		if ("options" in query) {
			query.options.forEach(function(option) {
				cmd += " -"+self.escape(option)
			})
		}
		if ("params" in query) {
			for (var k in query.params) {
				if (typeof query.params[k] == "object" && Array.isArray(query.params[k])) {
					cmd += " "
					query.params[k].forEach(function(p, i) {
						cmd += k+"="+self.escape(p)
						if (i + 1 < query.params[k].length) cmd+="|"
					})
					continue
				}
				cmd += " "+k+"="+self.escape(query.params[k])
			}
		}
		return  cmd + "\n"
	}

	return {
		on: function(name, cb) {
			if (!(name in self.events)) self.events[name] = []
			self.events[name].push(cb)
		},
		send: function() {
			var q = {}
			for (var k in arguments) {
				switch(typeof arguments[k]) {
					case "string":
						q.cmd = arguments[k] 
						break
					case "object":
						if (Array.isArray(arguments[k])) {
							q.options = arguments[k]
							break
						}
						q.params = arguments[k]
						break
					case "function":
						q.cb = arguments[k]
						break
				}
			}
			self.addQueue(q)
		}
	}
}
