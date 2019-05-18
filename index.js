/**
 *
 * {
 *   "accessory": "Remote Sensor",
 *   "type": "DHTX",
 *   "remote": {
 *     "baseUrl": "http://192.168.86.31" // will access "/data" to get {temperature:number, humidity:number}
 *   }
 * }
 */
const _ = require('lodash'),
  request = require('request'),
  pseudoHistory = require('fakegato-history');

  module.exports = function (homebridge) {
    const
      Service = homebridge.hap.Service,
      Characteristic = homebridge.hap.Characteristic,
      FakeGatoHistoryService = pseudoHistory(homebridge);

    var SensorArray;

    SensorArray = function (log, config) {
      this.log = log;

      this.request = request.defaults(_.defaults(config.remote, {
        method: 'get',
        json: true,
        timeout: (_.isNumber(config.timeout) ? config.timeout : 10) * 1000
      }));

      _.assign(this, {
        name: config.name || 'Remote Sensor',
        refresh: (_.isNumber(config.refresh) ? (config.refresh) : 60) * 1000,
        type: 'DHTX'
      });
    };

    Object.assign(SensorArray.prototype, {
      getHumiTemp: function (callback) {
        const sensor = this;

        this.request('/data', function (err, res, body) {
          if (err) {
            return callback(err);
          }

          if (!_.isObject(body) || !(_.isFinite(body.humidity) && _.isFinite(body.temperature))) {
            return callback(new Error('unable to parse response json for remote sensor'));
          }

          callback(null, body.humidity, body.temperature);
        });
      },

      updateHumiTemp: function (humi, temp) {
        var sensor = this;

        this.getHumiTemp(function (err, humiVal, tempVal) {
          if (err) {
            return this.log('error getting sensor readings for ' + sensor.name);
          }

          sensor.log('updating sensor readings: ' + humiVal + 'C, ' + tempVal + '%');
          temp.getCharacteristic(Characteristic.CurrentTemperature).updateValue(humiVal);
          humi.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(tempVal);
        });
      },

      getServices: function () {
        this.log("INIT: %s", this.name);

        var sensor = this,
          info = new Service.AccessoryInformation(),
          temp = new Service.TemperatureSensor(this.name),
          humi = new Service.HumiditySensor(this.name),
          hist = new FakeGatoHistoryService('weather', temp, {
            storage: 'fs',
            minutes: sensor.refresh * 10 / 16
          });

        info
          .setCharacteristic(Characteristic.Manufacturer, 'Remote Sensor')
          .setCharacteristic(Characteristic.Model, this.type)
          .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);

        temp.getCharacteristic(Characteristic.CurrentTemperature)
          .setProps({
            minValue: -40,
            maxValue: 125
          })
          .on('get', function (done) {
            sensor.getHumiTemp(function (err, humi, temp) {
              done(err, temp);
            });
          });

        humi.getCharacteristic(Characteristic.CurrentRelativeHumidity)
          .on('get', function (done) {
            sensor.getHumiTemp(function (err, humi) {
              done(err, humi);
            });
          });

        // set to update every refresh interval
        sensor.poll = setInterval(sensor.updateHumiTemp.bind(sensor, humi, temp), sensor.refresh);
        sensor.updateHumiTemp(humi, temp);
        return [info, humi, temp, hist];
      }
    });

    homebridge.registerAccessory('remote-sensor', 'Remote Sensor', SensorArray);
  }
