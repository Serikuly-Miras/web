#!/usr/bin/env fish

set -l host hz
set -l front_dir (dirname (status --current-filename))
set -l local_build $front_dir/build
set -l base /var/www/s-miras
set -l releases_dir $base/releases
set -l keep 3

set -l release_name (date +%Y%m%d%H%M%S)
set -l release_path $releases_dir/$release_name
set -l skip (math $keep + 1)

echo "==> lint + check"
npm --prefix $front_dir run lint
or begin
    echo "error: npm run lint failed" >&2
    exit 1
end

npm --prefix $front_dir run check
or begin
    echo "error: npm run check failed" >&2
    exit 1
end

echo "==> building"
npm --prefix $front_dir run build
or begin
    echo "error: npm run build failed" >&2
    exit 1
end

echo "==> syncing $local_build -> $host:$release_path"
ssh $host "mkdir -p $release_path"

set -l prev (ssh $host "readlink -f $base/current 2>/dev/null")
set -l link_dest
if test -n "$prev"
    set link_dest --link-dest=$prev
end
rsync -rlp --checksum --delete --stats $link_dest $local_build/ $host:$release_path/
or begin
    echo "error: rsync failed" >&2
    exit 1
end

echo "==> swapping current -> $release_name and pruning old releases (keeping last $keep)"
ssh $host "
    ln -sfn $release_path $base/current.tmp
    mv -Tf $base/current.tmp $base/current
    cd $releases_dir
    ls -1t | tail -n +$skip | xargs -r rm -rf --
"

echo "==> stats"
echo "local build:"
du -sh $local_build $local_build/gallery $local_build/asic
ssh $host "
    echo 'serving (current release):'
    du -sh $release_path $release_path/gallery $release_path/asic
    echo 'all $keep releases on disk (shared files counted once):'
    du -sh $releases_dir
    echo 'disk:'
    df -h $base | tail -n 1
"

echo "==> done"
