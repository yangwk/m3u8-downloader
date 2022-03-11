#!/bin/sh

set -eu

cd $(dirname "$0")

if [ -e "lock" ] ; then
  exit 1
fi

touch lock

echo processing...

name=default
suffix=.mpeg

for i in $(ls *.txt) 
do
  name=${i%.*}
done

path=../mpeg/
fileName="${path}${name}${suffix}"
tempSuffix=.download
tempFileName="${fileName}${tempSuffix}"

if [ -e "${fileName}" ] ; then
  exit 1
fi

# sometimes the name of downloaded ts file maybe not end with .ts
tsExtension=ts
tempExtension=
for i in $(ls ../m3u8/*.*) 
do
  tempExtension=${i##*.}
  if [ "${tempExtension}" != "m3u8" ] ; then
    if [ "${tempExtension}" != "${tsExtension}" ] ; then
      mv "${i}" "${i}.${tsExtension}"
	fi
  fi
done

count=$(ls ../m3u8/ | grep -E ".+\.ts$" | wc -l)

if [ ${count} -eq 0 ] ; then
  exit 1
fi

mkdir -p "${path}"

num=0
percent=0
for i in $(ls ../m3u8/*.ts)
do
    cat "${i}" >> "${tempFileName}"
	num=$((num+1))
	percent=$((num*100/count))
	echo "${percent}%"
done

cd "${path}"
mv "${name}${suffix}${tempSuffix}" "${name}${suffix}"

echo done

open .

exit 0
