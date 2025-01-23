const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");
  
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
  });
  
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };
  const CodeGenerationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };
  
   export const chatSession = model.startChat({
      generationConfig,
      history: [
      ],
    });

    export const GenAiCode=model.startChat({
      generationConfig:CodeGenerationConfig,
      history: [
        {
          role: "user",
          parts: [
            {text: "Create a todo app :\nGenerate a Project in React. Create multiple components, organizing them in separate folders with filenames using the .js extension, if needed. The output should use Tailwind CSS for styling, \nwithout any third-party dependencies or libraries, except for icons from the lucide-react library, which should only be used when necessary. Available icons include: Heart, Shield, Clock, Users, Play, Home, Search, Menu, User, Settings, Mail, Bell, Calendar, Star, Upload, Download, Trash, Edit, Plus, Minus, Check, X, and ArrowRight. For example, you can import an icon as import { Heart } from \"lucide-react\" and use it in JSX as <Heart className=\"\" />.\nalso you can use date-fns for date format and react-chartjs-2 chart, graph library\n\nReturn the response in JSON format with the following schema:\n{\n  \"projectTitle\": \"\",\n  \"explanation\": \"\",\n  \"files\": {\n    \"/App.js\": {\n      \"code\": \"\"\n    },\n    ...\n  },\n  \"generatedFiles\": []\n}\n\nHere’s the reformatted and improved version of your prompt:\n\nGenerate a programming code structure for a React project using Vite. Create multiple components, organizing them in separate folders with filenames using the .js extension, if needed. The output should use Tailwind CSS for styling, without any third-party dependencies or libraries, except for icons from the lucide-react library, which should only be used when necessary. Available icons include: Heart, Shield, Clock, Users, Play, Home, Search, Menu, User, Settings, Mail, Bell, Calendar, Star, Upload, Download, Trash, Edit, Plus, Minus, Check, X, and ArrowRight. For example, you can import an icon as import { Heart } from \"lucide-react\" and use it in JSX as <Heart className=\"\" />.\n\nReturn the response in JSON format with the following schema:\n\njson\nCopy code\n{\n  \"projectTitle\": \"\",\n  \"explanation\": \"\",\n  \"files\": {\n    \"/App.js\": {\n      \"code\": \"\"\n    },\n    ...\n  },\n  \"generatedFiles\": []\n}\nEnsure the files field contains all created files, and the generatedFiles field lists all the filenames. Each file's code should be included in the code field, following this example:\nfiles:{\n  \"/App.js\": {\n    \"code\": \"import React from 'react';\\nimport './styles.css';\\nexport default function App() {\\n  return (\\n    <div className='p-4 bg-gray-100 text-center'>\\n      <h1 className='text-2xl font-bold text-blue-500'>Hello, Tailwind CSS with Sandpack!</h1>\\n      <p className='mt-2 text-gray-700'>This is a live code editor.</p>\\n    </div>\\n  );\\n}\"\n  }\n}\n  Additionally, include an explanation of the project's structure, purpose, and functionality in the explanation field. Make the response concise and clear in one paragraph.\n  - When asked then only use this package to import, here are some packages available to import and use (date-fns,react-chartjs-2,\"firebase\",\"@google/generative-ai\" ) only when it required\n  \n  - For placeholder images, please use a https://archive.org/download/placeholder-image/placeholder-image.jpg\n  -Add Emoji icons whenever needed to give good user experinence\n  - all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are fully featured and worthy for production.\n\n- By default, this template supports JSX syntax with Tailwind CSS classes, React hooks, and Lucide React for icons. Do not install other packages for UI themes, icons, etc unless absolutely necessary or I request them.\n\n- Use icons from lucide-react for logos.\n\n- Use stock photos from unsplash where appropriate, only valid URLs you know exist. Do not download the images, only link to them in image tags.\n   `,\n\n\n\n}\n\n// - The lucide-react library is also available to be imported IF NECCESARY ONLY FOR THE FOLLOWING ICONS: Heart, Shield, Clock, Users, Play, Home, Search, Menu, User, Settings, Mail, Bell, Calendar, Clock, Heart, Star, Upload, Download, Trash, Edit, Plus, Minus, Check, X, ArrowRight. Here's an example of importing and using one: import { Heart } from \"lucide-react\"\\` & \\<Heart className=\"\"  />\\. PLEASE ONLY USE THE ICONS IF AN ICON IS NEEDED IN THE USER'S REQUEST.\n"},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "```json\n{\n  \"projectTitle\": \"React Todo App\",\n  \"explanation\": \"This React Todo App project provides a user-friendly interface for managing tasks. It allows users to add, edit, and delete tasks, marking them as complete. The app is structured with separate components for task input, task listing, and individual task items, promoting maintainability and scalability. Tailwind CSS is used for styling to create a visually appealing and responsive design, and lucide-react icons are included to improve user experience. This project is designed as a single-page application, delivering a seamless and efficient task management experience. Chartjs is used to show the progress of the tasks\",\n  \"files\": {\n    \"/App.js\": {\n      \"code\": \"import React, { useState, useEffect } from 'react';\\nimport TaskInput from './components/TaskInput';\\nimport TaskList from './components/TaskList';\\nimport TaskProgressChart from './components/TaskProgressChart';\\n\\nfunction App() {\\n  const [tasks, setTasks] = useState(() => {\\n    const savedTasks = localStorage.getItem('tasks');\\n    return savedTasks ? JSON.parse(savedTasks) : [];\\n  });\\n\\n  useEffect(() => {\\n    localStorage.setItem('tasks', JSON.stringify(tasks));\\n  }, [tasks]);\\n\\n  const addTask = (text) => {\\n    setTasks([...tasks, { id: Date.now(), text, completed: false }]);\\n  };\\n\\n  const toggleComplete = (id) => {\\n    setTasks(\\n      tasks.map((task) =>\\n        task.id === id ? { ...task, completed: !task.completed } : task\\n      )\\n    );\\n  };\\n\\n  const deleteTask = (id) => {\\n    setTasks(tasks.filter((task) => task.id !== id));\\n  };\\n\\n  const editTask = (id, newText) => {\\n    setTasks(\\n      tasks.map((task) => (task.id === id ? { ...task, text: newText } : task))\\n    );\\n  };\\n\\n  const completedTasksCount = tasks.filter((task) => task.completed).length;\\n  const totalTasksCount = tasks.length;\\n\\n  return (\\n    <div className=\\\"bg-gray-100 min-h-screen py-10\\\">\\n      <div className=\\\"container mx-auto p-4 bg-white shadow-md rounded-lg\\\">\\n        <h1 className=\\\"text-3xl font-semibold text-center text-gray-800 mb-6\\\">My Todo List 🚀</h1>\\n        <TaskInput addTask={addTask} />\\n        <TaskList\\n          tasks={tasks}\\n          toggleComplete={toggleComplete}\\n          deleteTask={deleteTask}\\n          editTask={editTask}\\n        />\\n         <TaskProgressChart completed={completedTasksCount} total={totalTasksCount} />\\n      </div>\\n    </div>\\n  );\\n}\\n\\nexport default App;\\n\"\n    },\n    \"/components/TaskInput.js\": {\n      \"code\": \"import React, { useState } from 'react';\\nimport { Plus } from 'lucide-react';\\n\\nfunction TaskInput({ addTask }) {\\n  const [text, setText] = useState('');\\n\\n  const handleSubmit = (e) => {\\n    e.preventDefault();\\n    if (text.trim()) {\\n      addTask(text);\\n      setText('');\\n    }\\n  };\\n\\n  return (\\n    <form onSubmit={handleSubmit} className=\\\"flex items-center mb-4\\\">\\n      <input\\n        type=\\\"text\\\"\\n        className=\\\"shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline\\\"\\n        placeholder=\\\"Add a task...\\\"\\n        value={text}\\n        onChange={(e) => setText(e.target.value)}\\n      />\\n      <button\\n        type=\\\"submit\\\"\\n        className=\\\"bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-2\\\"\\n      >\\n        <Plus className=\\\"h-5 w-5 inline-block align-middle\\\" />\\n      </button>\\n    </form>\\n  );\\n}\\n\\nexport default TaskInput;\\n\"\n    },\n    \"/components/TaskList.js\": {\n      \"code\": \"import React from 'react';\\nimport TaskItem from './TaskItem';\\n\\nfunction TaskList({ tasks, toggleComplete, deleteTask, editTask }) {\\n  return (\\n    <div>\\n      {tasks.map((task) => (\\n        <TaskItem\\n          key={task.id}\\n          task={task}\\n          toggleComplete={toggleComplete}\\n          deleteTask={deleteTask}\\n          editTask={editTask}\\n        />\\n      ))}\\n    </div>\\n  );\\n}\\n\\nexport default TaskList;\\n\"\n    },\n    \"/components/TaskItem.js\": {\n      \"code\": \"import React, { useState } from 'react';\\nimport { Trash, Edit, Check, X } from 'lucide-react';\\n\\nfunction TaskItem({ task, toggleComplete, deleteTask, editTask }) {\\n  const [isEditing, setIsEditing] = useState(false);\\n  const [editText, setEditText] = useState(task.text);\\n\\n  const handleSave = () => {\\n    editTask(task.id, editText);\\n    setIsEditing(false);\\n  };\\n\\n  return (\\n    <div className=\\\"flex items-center justify-between py-2 border-b border-gray-200\\\">\\n      {isEditing ? (\\n        <input\\n          type=\\\"text\\\"\\n          className=\\\"shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline\\\"\\n          value={editText}\\n          onChange={(e) => setEditText(e.target.value)}\\n        />\\n      ) : (\\n        <div className={`flex-grow ${task.completed ? 'line-through text-gray-500' : ''}`}>\\n          {task.text}\\n        </div>\\n      )}\\n\\n      <div>\\n        {\\n          isEditing ? (\\n            <>\\n              <button onClick={handleSave} className=\\\"bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2\\\">\\n                <Check className=\\\"h-5 w-5 inline-block align-middle\\\"/>\\n              </button>\\n              <button onClick={() => setIsEditing(false)} className=\\\"bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2\\\">\\n              <X className=\\\"h-5 w-5 inline-block align-middle\\\"/>\\n              </button>\\n            </>\\n          ) : (\\n            <>\\n              <button\\n                onClick={() => toggleComplete(task.id)}\\n                className=\\\"bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2\\\"\\n              >\\n                {task.completed ? 'Undo' : 'Complete'}\\n              </button>\\n              <button\\n                onClick={() => setIsEditing(true)}\\n                className=\\\"bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2\\\"\\n              >\\n                <Edit className=\\\"h-5 w-5 inline-block align-middle\\\"/>\\n              </button>\\n              <button\\n                onClick={() => deleteTask(task.id)}\\n                className=\\\"bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline\\\"\\n              >\\n                <Trash className=\\\"h-5 w-5 inline-block align-middle\\\"/>\\n              </button>\\n            </>\\n          )\\n        }\\n\\n      </div>\\n    </div>\\n  );\\n}\\n\\nexport default TaskItem;\\n\"\n    },\n     \"/components/TaskProgressChart.js\": {\\\n      \"code\": \"import React from 'react';\\nimport { Doughnut } from 'react-chartjs-2';\\nimport { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';\\nChartJS.register(ArcElement, Tooltip, Legend);\\n\\nfunction TaskProgressChart({ completed, total }) {\\n  const data = {\\n    labels: ['Completed', 'Remaining'],\\n    datasets: [\\n      {\\n        label: 'Task Progress',\\n        data: [completed, total - completed],\\n        backgroundColor: ['#36A2EB', '#FF6384'],\\n        hoverBackgroundColor: ['#36A2EB', '#FF6384']\\n      }\\n    ]\\n  };\\n\\n  const options = {\\n    responsive: true,\\n    maintainAspectRatio: false\\n  };\\n\\n  return (\\n    <div className=\\\"w-full md:w-1/2 lg:w-1/3 h-64 mt-4 mx-auto\\\">\\n      <Doughnut data={data} options={options} />\\n    </div>\\n  );\\n}\\n\\nexport default TaskProgressChart;\\n\"\n    }\n  },\n  \"generatedFiles\": [\n    \"/App.js\",\n    \"/components/TaskInput.js\",\n    \"/components/TaskList.js\",\n    \"/components/TaskItem.js\",\n    \"/components/TaskProgressChart.js\"\n  ]\n}\n```"},
          ],
        },
      ],

    })
  
    // const result = await chatSession.sendMessage("INSERT_INPUT_HERE");
    // console.log(result.response.text());
