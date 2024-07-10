import React, { useEffect, useCallback, useState, useRef } from 'react';
import { View, Text, Button, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import useLoadPageImages from './useLoadPageImages'; // Adjust the path as needed
import ChapterPage from '../chapters/ChapterPage';
import { Gallery } from 'react-native-zoom-toolkit';

import * as FileSystem from 'expo-file-system'
import shorthash from 'shorthash';
import { getMangaDirectory } from '../../services/Global';
import { getImageDimensions, fetchPageData } from './_reader';

const HorizontalReader = ({ currentManga, chapterPages, inverted, onTap }) => {
  const [pageImages, setPageImages] = useState(Array(chapterPages.length).fill(undefined));

  const controllerRef = useRef(null)
  const isMounted = useRef(true);
  const pagesRef = useRef([])

  const AsyncEffect = async () => {
    console.log("natawag asynceffect")

    controllerRef.current = new AbortController();
    const signal = controllerRef.current.signal;
  
    const pageDataPromises = chapterPages.map(async (pageUrl, index) => {
      try {
        const fetchedImgSrc = await fetchPageData(currentManga.manga, currentManga.chapter, pageUrl, signal);
        if (fetchedImgSrc.error) {
            throw fetchedImgSrc.error
        };
  
        const imgSize = await getImageDimensions(fetchedImgSrc.data);

        if(pagesRef.current[index]) pagesRef.current[index].toggleRender({aspectRatio: imgSize.width/imgSize.height})

        console.log("Page:", index + 1, "has been loaded!")
  
    } catch (error) {
        console.log("Error loading pages:", error);
    }
    });
    
    await Promise.allSettled(pageDataPromises)

    

  };

  const loadPageImages = async () => {
    console.log("natawag")
    const hashedPagePaths = await Promise.all(chapterPages.map(async (pageUrl) => {
      const pageFileName = shorthash.unique(pageUrl);
      const cachedChapterPageImagesDir = getMangaDirectory(currentManga.manga, currentManga.chapter, "chapterPageImages", pageFileName);
      const fileInfo = await FileSystem.getInfoAsync(cachedChapterPageImagesDir.cachedFilePath)

      let imgSize = {width: 1, height: 1}

      if(fileInfo.exists) imgSize = await getImageDimensions(cachedChapterPageImagesDir.cachedFilePath)
      
      return {imgUri: cachedChapterPageImagesDir.cachedFilePath, fileExist: fileInfo.exists, imgSize, tryFunc: () => {
        return 1
      }};
    }));
  
    setPageImages(hashedPagePaths);
  }

  useEffect(() => {
    loadPageImages()
  }, [])

  useEffect(() => {
      AsyncEffect();
      return () => {
        controllerRef.current.abort();
      };
  }, []);

  const renderItem = useCallback((item, index) => {
    return (
      <View>
       <ChapterPage
            ref={(page) => { pagesRef.current[index] = page;}}
            currentManga={currentManga}
            imgSrc={item}
            pageUrl={chapterPages[index]}
            pageNum={index}
            onPageLoad={()=>{}}
            onRetry={()=>{}}
            horizontal
        />
      </View>
    );
  }, []);
  const keyExtractor = useCallback((item, index) => {
    return ` ${item}-${index}`;
  }, []);

  return (
      <View className="h-full w-full">
        <View className="flex-1">
          {chapterPages && chapterPages.length > 0 ? (
            <Gallery
              data={inverted ? [...pageImages].reverse() : pageImages}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              onTap={onTap}
              maxScale={2.5}
          />
          ) : (
            <ActivityIndicator size='large' color='red'/>
          )}
        </View>
  
      </View>
  );
};

export default HorizontalReader;