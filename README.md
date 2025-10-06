# Odin Inventory Application

## Description
This is my implementation of the Inventory Application project of the Odin Project's Node.js course as part of their Full-Stack Javascript curriculum.

I made a pokemon trainer generator and team-builder in Express. The general structure is a standard MVC pattern using ejs as the view engine. All data is stored in a PostgreSQL database and retrieved using database queries.

Users can generate pokemon trainers and then assign pokemon to their team. Pokemon are searchable by type, generation, and name. Users can then customize the pokemon's nickname, gender, level, and nature for a game-like feel. The species data is held in one table and individual instances of trainer pokemon are held in another, with their respective trainer's uuid as a foreign key for retrieval.