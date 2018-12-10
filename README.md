![Logo](admin/viessmannapi.png)
# ioBroker.viessmannapi
=================

This adapter connects your ioBroker system to your Viessmann central heating via the Viessmann API. All enabled information provided by the API is polled periodically (every 60 sec) and written into states.

## Installation
install the Adpater from this github repository. On adapter settings, enter user name and password of your Viessmann account. If everything goes well, you should see states appear under `viessmannapi.X`. First values should arrive after 60 seconds.

## States
The specific states may depend on your installation. Examples are
- `viessmannapi.0.heating.boiler.sensors.temperature.main.value` - boiler temperature
- `viessmannapi.0.heating.circuits.0.heating.curve.shift` and `slope` - shift and slope determining the heating curve
- `viessmannapi.0.heating.circuits.0.operating.modes.active.value` - current operating mode; for example `dhw` means hot water only, `dhwAndHeating` means hot water and heating
- `viessmannapi.0.heating.sensors.temperature.outside.value` - outside temperature measured by the external sensor

## Notes
- This adpater is in early development! Expect bugs, and feel free to report bugs here on github (https://github.com/thovid/ioBroker.viessmannapi/issues").

- Currently, it is not implemented to change values or settings. This is planned for a future release.

## Changelog
### 1.1.0 (2018/12/10)
* (thovid) Deletes email and password after sucessful connection, further connections are done via refresh token
* (thovid) Uses npm released version of client lib, so no longer requires git upon installation
### 1.0.0 (2018/12/07)
* (thovid) Initial adapter

## License
The MIT License (MIT)

Copyright (c) 2018 Thomas Vidic

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
