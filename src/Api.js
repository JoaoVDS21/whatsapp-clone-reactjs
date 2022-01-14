import { initializeApp } from 'firebase/app'
import { getAuth, signInWithPopup, FacebookAuthProvider } from 'firebase/auth'
import { getFirestore, doc, setDoc, collection, query, getDocs, getDoc, addDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';

import firebaseConfig from './firebaseConfig'

const firebaseApp = initializeApp(firebaseConfig)
const db = getFirestore(firebaseApp)

export default {
    fbPopup: async () => {
        const provider = new FacebookAuthProvider()
        const auth = getAuth()
        let result = await signInWithPopup(auth, provider)
        return result
    },
    addUser: async (u) => {
        console.log(u.id)
        await setDoc(doc(db, 'users', u.id), {
            name: u.name,
            avatar: u.avatar,
        }, {merge: true})
    },
    getContactList: async (userId) => {
        let list = []

        let stmtp = query(collection(db, 'users'))
        let results = await getDocs(stmtp)
        results.forEach(result => {
            let data = result.data()
            
            if(result.id !== userId){
                list.push({
                    id: result.id,
                    name: data.name,
                    avatar: data.avatar
                })
            }
        })

        return list
    },
    addNewChat: async (user, otherUser) => {
        let newChat = await addDoc(collection(db, 'chats'),{
            messages: [],
            users: [user.id, otherUser.id]
        })

        await updateDoc(doc(db, 'users', user.id), {
            chats: arrayUnion({
                chatId: newChat.id,
                title: otherUser.name,
                image: otherUser.avatar,
                with: otherUser.id
            })
        })

        await updateDoc(doc(db, 'users', otherUser.id), {
            chats: arrayUnion({
                chatId: newChat.id,
                title: user.name,
                image: user.avatar,
                with: user.id
            })
        })
    },
    onChatList: (userId, setChatList) => {
        return onSnapshot(doc(db, 'users', userId), (doc) => {
            if(doc.exists) {
                let data = doc.data()
                if(data.chats){
                    let chats = [...data.chats]

                    chats.sort((a,b)=>{
                        if(a.lastMessageDate === undefined){
                            return -1
                        }
                        if(b.lastMessageDate === undefined){
                            return -1
                        }
                        if (a.lastMessageDate.seconds < b.lastMessageDate.seconds){
                            return 1
                        } else {
                            return -1
                        }
                    })

                    setChatList(data.chats)
                }
            }
        })
    },
    onChatContent: (chatId, setList, setUsers) => {
        return onSnapshot(doc(db, 'chats', chatId), (doc)=>{
            if(doc.exists) {
                let data = doc.data()
                setList(data.messages)
                setUsers(data.users)
            }
        })
    },
    sendMessage: async (chatData, userId, type, body, users) => {
        let now = new Date()
        
        updateDoc(doc(db, 'chats', chatData.chatId), {
            messages: arrayUnion({
                type,
                author: userId,
                body,
                date: now
            })
        })

        for(let i in users) {
            let u = await getDoc(doc(db, 'users', users[i]))
            let uData = u.data()
            if(uData.chats){
                let chats = [...uData.chats]

                for(let e in chats){
                    if(chats[e].chatId == chatData.chatId) {
                        chats[e].lastMessage = body
                        chats[e].lastMessageDate = now
                    }
                }

                await updateDoc(doc(db, 'users', users[i]), {
                    chats
                })
            }
        }
    }
}