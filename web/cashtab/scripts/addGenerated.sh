#!/usr/bin/env bash

export LC_ALL=C

auto_add_generated_to_snapshots(){
snapshot_file_array=() 
snapshot_file_array+=$(find -name "*.test.js.snap")
for i in $snapshot_file_array
do
if ! grep -q @generated $i
then
sed -i '1 s/$/ @generated/' $i
fi
done
}

auto_add_generated_to_snapshots

exit 0