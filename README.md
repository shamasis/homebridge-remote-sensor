# homebridge-remote-sensor
Homebridge plugin for remote http based sensors

## Sample Homebridge Configuration

```json
{
  "accessories": [
    {
      "accessory": "Remote Sensor",
      "name": "Weather Station",
      "type": "DHTX",
      "remote": {
        "baseUrl": "http://192.168.86.31"
      }
    }
  ]
}
```

## Sample Arduino code

https://gist.github.com/shamasis/7415de7074a441444d89cc4b2b5fb83b
