#!/usr/bin/env fish

set -l host hz
set -l back_dir (dirname (status --current-filename))/../back
set -l target x86_64-unknown-linux-gnu
set -l local_bin $back_dir/target/$target/release/back
set -l base /opt/back
set -l releases_dir $base/releases
set -l keep 3
set -l service back

set -l release_name (date +%Y%m%d%H%M%S)
set -l release_path $releases_dir/$release_name
set -l skip (math $keep + 1)

echo "==> check"
cargo check --manifest-path $back_dir/Cargo.toml
or begin
    echo "error: cargo check failed" >&2
    exit 1
end

echo "==> building (release, $target)"
cargo zigbuild --release --target $target --manifest-path $back_dir/Cargo.toml
or begin
    echo "error: cargo zigbuild failed" >&2
    exit 1
end

echo "==> syncing $local_bin -> $host:$release_path"
ssh $host "mkdir -p $release_path"
rsync -a $local_bin $host:$release_path/back

echo "==> swapping current -> $release_name, restarting $service, pruning old releases (keeping last $keep)"
ssh $host "
    chmod +x $release_path/back
    ln -sfn $release_path $base/current.tmp
    mv -Tf $base/current.tmp $base/current
    sudo systemctl restart $service
    cd $releases_dir
    ls -1t | tail -n +$skip | xargs -r rm -rf --
"

echo "==> done"
