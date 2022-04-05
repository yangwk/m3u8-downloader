#!/bin/sh

set -eu

cd $(dirname "$0")

if [ -e "lock" ] ; then
  exit 1
fi

touch lock

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

if [ -e "${path}" ] ; then
  exit 1
fi

echo processing...

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

if [ ${count} -le 0 ] ; then
  exit 1
fi


parseM3u8Name(){
    local m3u8Name=$(basename "$1")
    local m3u8NameSplit=(`echo ${m3u8Name} | tr '-' ' '`)
    splitMerge=${m3u8NameSplit[1]}
    expectedCount=${m3u8NameSplit[2]}
    mergeStart=${m3u8NameSplit[3]}
    mergeEnd=${m3u8NameSplit[4]}
}

mergeM3u8(){
    if [ ${count} -ne ${expectedCount} ] ; then
      exit 1
    fi
    
    mkdir -p "${path}"
    
    local percent=0
    local mergeIndex=0
    for i in $(ls ../m3u8/*.ts)
    do
        if [ ${mergeIndex} -ge ${mergeStart} ] ; then
            if [ ${mergeIndex} -le ${mergeEnd} ] ; then
                cat "${i}" >> "${tempFileName}"
                handleNum=$((handleNum+1))
                percent=$((handleNum*100/count))
                echo "${percent}%"
            fi
        fi
        mergeIndex=$((mergeIndex+1))
    done
}

completeM3u8(){
    local fileIndex=
    if [ ${splitMerge} -eq 1 ] ; then
        fileIndex=-${mainIndex}
    fi
    
    mv "${path}${name}${suffix}${tempSuffix}" "${path}${name}${fileIndex}${suffix}"
    
    if [ ${handleNum} -ge ${count} ] ; then
        echo done
        cd "${path}"
        open .
    fi
}


mainIndex=0
handleNum=0
for i in $(ls ../m3u8/*.m3u8)
do
    parseM3u8Name "${i}"
    mainIndex=$((mainIndex+1))
    mergeM3u8
    completeM3u8
done

exit 0
