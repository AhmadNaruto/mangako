import { View, Text, Button } from 'react-native'
import React, {useRef, useEffect, useReducer, useCallback } from 'react'
import { router, useLocalSearchParams } from 'expo-router';

import * as backend from "./_manga_reader"
import VerticalReader from '../../components/reader_mode/VerticalReader';
import HorizontalReader from '../../components/reader_mode/HorizontalReader';
import DropDownList from '../../components/modal/DropdownList';
import ModalPopup from '../../components/modal/ModalPopup';
import HorizontalRule from '../../components/HorizontalRule';
import { readPageLayout } from '../../components/reader_mode/_reader';

import { readerReducer, INITIAL_STATE } from '../../redux/readerScreen/readerReducer';
import { READER_ACTIONS } from '../../redux/readerScreen/readerActions';

const MangaReaderScreen = () => {
    const {mangaUrl, currentChapterData } = useLocalSearchParams()
    const parsedCurrentChapterData = JSON.parse(currentChapterData)

    const [state, dispatch] = useReducer(readerReducer, INITIAL_STATE)

    const chapterRef = useRef(parsedCurrentChapterData.chapterUrl)
    const isMounted = useRef(true)
    const controllerRef = useRef(null)

    const AsyncEffect = useCallback(async () => {
        
        dispatch({type: READER_ACTIONS.GET_CHAPTER_PAGES})
        const savedConfig = await backend.readMangaConfigData(mangaUrl, chapterRef.current)
        const savedPageLayout = await readPageLayout(mangaUrl, chapterRef.current);
        
        if(savedConfig) dispatch({type: READER_ACTIONS.LOAD_CONFIG, payload: {
            currentPage: savedConfig?.chapter?.currentPage || 0,
            readingModeIndex: savedConfig?.manga?.readingModeIndex || 0,
            pageLayout: !savedPageLayout.error ? savedPageLayout.data : [],
            scrollOffSetY: savedConfig?.chapter?.scrollOffSetY || 0,
        }})
        
        controllerRef.current = new AbortController();
        const signal = controllerRef.current.signal;

        try {
            const fetchedChapterPages = await backend.fetchData(mangaUrl, chapterRef.current, signal);
            if(fetchedChapterPages.error) throw fetchedChapterPages.error
            dispatch({type: READER_ACTIONS.GET_CHAPTER_PAGES_SUCCESS, payload: fetchedChapterPages.data})
        } 
        catch (error) {
            if (signal.aborted) {
                console.log("Fetch aborted");
            } else {
                console.log("Error fetching chapter pages:", error);
            }
            dispatch({type: READER_ACTIONS.GET_CHAPTER_PAGES_ERROR})
            router.back()
            
        } 
        
    }, [])

    useEffect(() => {
        AsyncEffect()
        return () => {
            isMounted.current = false
            controllerRef.current.abort()
            dispatch({type: READER_ACTIONS.EFFECT_CLEAN_UP})
        }
    }, [])

    const handleTap = useCallback(() => {
        dispatch({type: READER_ACTIONS.SHOW_MODAL, payload: state.showModal})
    }, [])

    const handlePageChange = useCallback(async (currentPage) => {
        dispatch({type: READER_ACTIONS.SET_CURRENT_PAGE, payload: currentPage})
        await backend.saveMangaConfigData(mangaUrl, chapterRef.current, {"currentPage": currentPage})
    }, [state.currentPage])

    const handleVertScroll = useCallback(async (scrollOffSetY) => {
        console.log("save:", scrollOffSetY)
        await backend.saveMangaConfigData(mangaUrl, chapterRef.current, {scrollOffSetY})
    }, [])

    const handleChapterNavigation = async (navigationMode) => {
        setIsLoading(true)
        const nextChapterPageUrls  = await backend.chapterNavigator(mangaLink, chapterRef.current, navigationMode)
        
        if(nextChapterPageUrls.error) {
          
          alert(navigationMode === backend.CHAPTER_NAVIGATION.NEXT ? "Next chapter not found." : "Previous chapter not found")
          setIsLoading(false)
          return
        }
        setChapterUrls(nextChapterPageUrls.data)
        currentChapter.current = nextChapterPageUrls.url
        setIsLoading(false)
      }

    return (
        <View className="h-full bg-primary">
            <ModalPopup visible={state.showModal} handleClose={() => {dispatch({type: READER_ACTIONS.SHOW_MODAL, payload: state.showModal})}}>
                <View className="mx-4">
                    <View className="justify-start w-full">
                    <Text numberOfLines={1} className="text-white font-pregular text-base text-center p-2 py-3">{parsedCurrentChapterData.chTitle}</Text>
                    </View>
                    <HorizontalRule />
                    <View className="w-full">
                    <DropDownList
                        title={"Reading mode:"}
                        otherContainerStyles={'rounded-md p-2 px-4  z-50 '}
                        listItems={backend.READER_MODES}
                        onValueChange={async (data) => {
                            await backend.saveMangaConfigData(mangaUrl, chapterRef.current, {"readingModeIndex": backend.READER_MODES.indexOf(data)}, true)
                            dispatch({type: READER_ACTIONS.SET_READER_MODE, payload: data})
                        }}
                        selectedIndex={backend.READER_MODES.indexOf(state.readingMode)}
                    />
                    </View>
                </View>

                <Button title='delete config' onPress={async () => {
                    await backend.deleteConfigData(mangaUrl, chapterRef.current, "manga")
                }} />
          </ModalPopup>
            {!state.isLoading && (
            <View>
                {state.readingMode === backend.READER_MODES[0] && (
                    <HorizontalReader 
                        chapterPages={state.chapterPages}
                        currentManga={{
                            manga: mangaUrl,
                            chapter: chapterRef.current
                        }}
                        onTap={handleTap}
                        currentPage={state.currentPage}
                        onPageChange={handlePageChange}
                    />
                )}

                {state.readingMode === backend.READER_MODES[1] && (
                    <HorizontalReader 
                        chapterPages={state.chapterPages}
                        currentManga={{
                            manga: mangaUrl,
                            chapter: chapterRef.current
                        }}
                        onPageChange={handlePageChange}
                        onTap={handleTap}
                        currentPage={state.chapterPages.length - 1 - state.currentPage}
                        inverted
                    />
                )}

                {state.readingMode === backend.READER_MODES[2] && (
                    <VerticalReader 
                        chapterPages={state.chapterPages}
                        currentManga={{
                            manga: mangaUrl,
                            chapter: chapterRef.current
                        }}
                        onPageChange={handlePageChange}
                        onTap={handleTap}
                        currentPage={state.currentPage}
                        savedPageLayout={state.pageLayout}
                        savedScrollOffsetY={state.scrollOffSetY}
                        onScroll={handleVertScroll}
                        inverted
                    />
                )}
            <View pointerEvents='none' className="bg-transparent absolute bottom-2 items-center w-full">
                <Text className="font-pregular text-white text-xs">{state.currentPage + 1}/{state.chapterPages.length}</Text>
            </View>
            </View>
            )}

        </View>
    )
}

export default MangaReaderScreen