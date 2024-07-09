import { View } from 'react-native'
import React, {useState, useRef, useEffect} from 'react'
import { useLocalSearchParams } from 'expo-router';

import * as backend from "./_manga_reader"
import VerticalReader from '../../components/reader_mode/VerticalReader';
import HorizontalReader from '../../components/reader_mode/HorizontalReader';
import ZoomableFlatlist from '../../components/reader_mode/ZoomableFlatlist';


const MangaReaderScreen = () => {
    const {mangaUrl, currentChapterData } = useLocalSearchParams()
    
    const [chapterPages, setChapterPages] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [errorData, setErrorData] = useState(null)

    const isMounted = useRef(true)
    const controllerRef = useRef(null)
    const parsedCurrentChapterData = useRef(JSON.parse(currentChapterData))

    const AsyncEffect = async () => {
        setIsLoading(true);

        controllerRef.current = new AbortController();
        const signal = controllerRef.current.signal;

        try {
            const fetchedChapterPages = await backend.fetchData(mangaUrl, parsedCurrentChapterData.current.chapterUrl, signal);
            setChapterPages(fetchedChapterPages.data);
        } 
        catch (error) {
            if (signal.aborted) {
                console.log("Fetch aborted");
            } else {
                console.log("Error fetching chapter pages:", error);
            }
            setChapterPages([])
            setErrorData(error)
        } 
        finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        AsyncEffect()
        return () => {
            isMounted.current = false
            controllerRef.current.abort()
            setChapterPages([])
        }
    }, [])

    return (
        <View className="h-full bg-primary">
            {!isLoading && (
                // <VerticalReader 
                //     chapterPages={chapterPages}
                //     currentManga={{
                //         manga: mangaUrl,
                //         chapter: parsedCurrentChapterData.current.chapterUrl
                //     }}
                // />
                <HorizontalReader 
                    chapterPages={chapterPages}
                    currentManga={{
                        manga: mangaUrl,
                        chapter: parsedCurrentChapterData.current.chapterUrl
                    }}
                />
                // <ZoomableFlatlist
                //     chapterPages={chapterPages}
                //     currentManga={{
                //         manga: mangaUrl,
                //         chapter: parsedCurrentChapterData.current.chapterUrl
                //     }}
                // />

            )}
        </View>
    )
}

export default MangaReaderScreen