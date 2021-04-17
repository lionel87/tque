# Data Transform Que

A flexible data transform que where you can control the transform steps for each data object.

## Install

```shell
npm i tque
```

## TL;DR

You have a bunch of data in multiple JS objects.
You want to transform these data with a set of functions.
You want to control the list of called functions for each data object.

1. Create a template que eg.: `const T = series(fn1, fn2, fn3)`.\
   Here `T` is now a callable function which can have one inpuit parameter with a type of `object`, `Iterable<object>` or `AsyncIterable<object>` (incl. object streams).

    Alternative helpers to que up functions in a template:
    - `series()`: the functions executed in series.
    - `parallel()`: the functions executed simultaneously.
    - `branch()`: creates multiple branches; each branch starting with one of the input functions.

2. Start the transformations by calling the `T(data)` template. This ques up all the functions defined in the template to be executed on the data.

3. These functions can que up other functions conditionally while they are running. This means each data object can have their own path of transformations based on their contents.

## Example
This example showcases some key features of the package.\
Lets say we want to write two letters next year for a few people.
```js
import { series, branch } from 'tque';

const myInputData = [
    { name: 'Peter', age: 15 },
    { name: 'Robert', age: 27 },
];

// this task modifies the data directly
function ageNextYear(person) { person.age++; }

// this task adds new functions to the que based on the data
function greeting(person) {
    if (person.age < 19) {
        this.push(greetYoung);
    } else if (person.age < 31) {
        this.push(greetYoungAdult);
    } else {
        this.push(greetOldMan);
    }
}

// these functions extends the data with their return values
const greetYoung = ({ name }) => ({ greet: `Hello ${name}!` });
const greetYoungAdult = ({ name }) => ({ greet: `Hi ${name} bro!` });
const greetOldMan = ({ name }) => ({ greet: `Damn, you old ${name}!` });

const letterA = () => ({ body: 'See you soon!' });
const letterB = () => ({ body: 'Lets meet next week!' });

const finalize = d => { delete d.name; delete d.age; };

// create a template que
const transforms = series(ageNextYear, greeting, branch(letterA, letterB), finalize);

// create a real que based on the template and execute its functions on the data
transforms(myInputData).then(console.log, console.error);

// Should output:
// { greet: 'Hello Peter!', body: 'See you soon!' }
// { greet: 'Hello Peter!', body: 'Lets meet next week!' }
// { greet: 'Hi Robert bro!', body: 'See you soon!' }
// { greet: 'Hi Robert bro!', body: 'Lets meet next week!' }

```

## Documentation
Still missing.
