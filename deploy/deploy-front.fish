#!/usr/bin/env fish

set -l host hz
set -l front_dir (dirname (status --current-filename))/../front
set -l local_build $front_dir/build
set -l base /var/www/s-miras
set -l releases_dir $base/releases
set -l keep 3

set -l release_name (date +%Y%m%d%H%M%S)
set -l release_path $releases_dir/$release_name
set -l skip (math $keep + 1)

echo "==> building"
npm --prefix $front_dir run build
or begin
    echo "error: npm run build failed" >&2
    exit 1
end

echo "==> syncing $local_build -> $host:$release_path"
ssh $host "mkdir -p $release_path"
rsync -a --delete $local_build/ $host:$release_path/

echo "==> swapping current -> $release_name and pruning old releases (keeping last $keep)"
ssh $host "
    ln -sfn $release_path $base/current.tmp
    mv -Tf $base/current.tmp $base/current
    cd $releases_dir
    ls -1t | tail -n +$skip | xargs -r rm -rf --
"

echo "==> done"
