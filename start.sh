docker-machine rm --force oauthing
docker-machine create --driver digitalocean --digitalocean-region=lon1  --digitalocean-size=2gb --digitalocean-access-token=$DIGOCTOK  --digitalocean-image ubuntu-14-04-x64 --digitalocean-private-networking=true oauthing
# 
# 
# docker-machine create --driver digitalocean --digitalocean-region=lon1  --digitalocean-size=2gb --digitalocean-access-token=$DIGOCTOK  --digitalocean-image centos-7-2-x64 oauthing
doctl compute floating-ip-action assign 139.59.197.64 $(doctl compute droplet list oauthing -t $DIGOCTOK --format ID --no-header) -t $DIGOCTOK 
docker-machine scp -r keys oauthing:/root/
eval $(docker-machine env oauthing)
docker-compose up --build


