
main: .docker_start test_clean test_init

.db_data_clear:
	rm -rvf db-data/*

.docker_start:
	systemctl is-active docker.service || systemctl start docker.service

test_build: .docker_start
	docker-compose build

test_run: test_build
	docker-compose up

test_init: test_run


test_stop:
	docker-compose stop
	docker-compose rm -f

test_clean: test_stop .db_data_clear



