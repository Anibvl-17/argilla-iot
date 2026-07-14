FROM eclipse-mosquitto:2.0.22

COPY ./config/mosquitto.conf /mosquitto/config/mosquitto.conf

EXPOSE 1883
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=5s \
  CMD mosquitto_pub -h 127.0.0.1 -p 1883 -t healthcheck -m ping || exit 1
