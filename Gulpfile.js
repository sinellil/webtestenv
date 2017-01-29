var gulp = require('gulp'),
runSequence = require('run-sequence'),
plumber = require('gulp-plumber'),
clean = require('gulp-clean'),
newer = require('gulp-newer'),
concat = require('gulp-concat'),
uglify = require('gulp-uglify'),
rename = require('gulp-rename'),
sourcemaps = require('gulp-sourcemaps'),
minifycss = require('gulp-minify-css'),
minifyhtml = require('gulp-minify-html'),
imagemin = require('gulp-imagemin'),
pngquant = require('imagemin-pngquant'),
jshint = require('gulp-jshint'),
stylish = require('jshint-stylish'),
jshintfileoutput = require('gulp-jshint-html-reporter'),
ts = require('gulp-typescript'),
tslint = require('gulp-tslint'),
tsstylish = require('gulp-tslint-stylish'),
sass = require('gulp-ruby-sass'),
scsslint = require('gulp-scss-lint'),
watch = require('gulp-watch'),
replace = require('gulp-replace-task'),
args = require('yargs').argv,
fs = require('fs');

var cfg = require('./gulp-config.json');
var tsPrj = ts.createProject(cfg.paths.tsconfig);

var onError = function(err) {
    console.log(err);
};

gulp.task('default', function() {
    runSequence('clean-dist', 'copy', 'inject',
        ['minifyhtml', 'minifyimage', 'jshint', 'tscompile',
            'tslint', 'sass', 'scsslint'],
        ['uglifyalljs', 'minifycss'],
        'watch');
});

gulp.task('clean-dist', function () {
    return gulp.src(cfg.paths.dist.clean, {read: false})
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(clean());
});

gulp.task('copy', function () {
    return gulp.src(cfg.paths.copy)
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(newer(cfg.paths.dist.root))
        .pipe(gulp.dest(cfg.paths.dist.root));
});

gulp.task('uglifyalljs', function () {
    return gulp.src(['dist/**/*.js', '!/**/*.min.js', '!dist/core/lib/**/*', '!dist/core/common/**/*'],
        { base: 'dist/./' })
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(rename({
            extname: '.min.js'
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/./'));
});

gulp.task('minifycss', ['copy'], function () {
    return gulp.src(['dist/**/*.css', '!/**/*.min.css', '!dist/core/lib/**/*'], { base: 'dist/./' })
        .pipe(sourcemaps.init())
        .pipe(minifycss())
        .pipe(rename({
            extname: '.min.css'
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/./'));
});

gulp.task('minifyhtml', function () {
    return gulp.src(['dist/**/*.html', '!/**/*.min.html', '!dist/core/lib/**/*'], { base: 'dist/./' })
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(sourcemaps.init())
        .pipe(minifyhtml())
        .pipe(rename({
            extname: '.min.html'
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/./'));
});

gulp.task('minifyimage', function () {
    return gulp.src(['dist/**/*.{png,jpg,gif,ico}', '!dist/core/lib/**/*.*', '!dist/core/css/**/*.*'])
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(imagemin({ progressive: true, optimizationLevel: 7, use: [pngquant()] }))
        .pipe(gulp.dest('dist/./'));
});

// -------------------------------------------------
// Grunt configuration
require('gulp-grunt')(gulp, {
    // These are the default options but included here for readability.
    base: null,
    prefix: 'grunt-',
    verbose: false
});
// -------------------------------------------------

gulp.task('inject', function() {
    var wiredep = require('wiredep').stream;
    var inject = require('gulp-inject');
    var options = {
        bowerJson: require(cfg.paths.bower),
        directory: cfg.paths.dist.vendor,
        ignorePath: '../../public'
    };

    return gulp.src(cfg.paths.jadeFiles)
        .pipe(wiredep(options))
        .pipe(inject(gulp.src(cfg.paths.inject, {read: false}), {ignorePath: '/public'}))
        .pipe(gulp.dest(cfg.paths.views));
});

gulp.task('jshint', function () {
    return gulp.src(['./dist/**/*.js', '!dist/core/lib/**/*.*', '!**/*.min.js', '!dist/core/css/**/*.*'])
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter(stylish))
        .pipe(jshint.reporter('gulp-jshint-html-reporter', {filename: 'jshint-output.html'}));
});

gulp.task('tscompile', function () {
    return gulp.src(cfg.paths.ts)
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(sourcemaps.init())
        .pipe(ts({
            target: 'ES5',
            declarationFiles: false,
            noResolve: true
        }))
        .pipe(gulp.dest(cfg.paths.dist.scripts));
});

gulp.task('tslint', ['copy'], function () {
    return gulp.src(cfg.paths.ts)
        .pipe(tslint({
            formatter: 'verbose'
        }))
        .pipe(tslint.report({
            emitError: false,
            sort: true,
            bell: true
        }));
});

gulp.task("sass", function() {
    var opts = {
        compass: true,
        sourcemap: false,
        style: "expanded"
    };

    return sass(cfg.paths.styles, opts)
        .on("error", sass.logError)
        .pipe(gulp.dest(cfg.paths.dist.styles));
});

gulp.task("scsslint", function() {
    var opts = {
        'config': "lint.yml",
        'filePipeOutput': "scss.json"
    };

    return gulp.src(cfg.paths.styles)
        .pipe(scsslint(opts))
        .pipe(scsslint.failReporter("E"))
        .pipe(gulp.dest("./reports/sass"));
});

gulp.task('watch', function () {

    // ---------------------------------------------------------------
    // Watching JS files
    // ---------------------------------------------------------------

    // Uglify JS files
    gulp.watch(cfg.paths.dist.scripts, function () { runSequence('uglifyalljs'); });

    // ---------------------------------------------------------------
    // Watching css and scss files
    // ---------------------------------------------------------------
    gulp.watch(cfg.paths.dist.styles, function () { runSequence('minifycss'); });
    gulp.watch(cfg.paths.styles, function () { runSequence(['sass', 'scsslint']); });

    // ---------------------------------------------------------------
    // Watching TypeScript files
    // ---------------------------------------------------------------
    gulp.watch(cfg.paths.ts, function () { runSequence('tscompile'); });

    // ---------------------------------------------------------------
    // Watch - Execute linters
    // ---------------------------------------------------------------
    gulp.watch(cfg.paths.ts, function () { runSequence('tslint'); });


    gulp.watch(cfg.paths.scripts, ['jshint']);

});

gulp.task('setEnv', function () {
    // Get the environment from the command line
    var env = args.env || 'localdev';

    // Read the settings from the right file
    var filename = 'env.config.' + env + '.json';
    var settings = JSON.parse(fs.readFileSync('dist/' + filename, 'utf8'));

    // Replace each placeholder with the correct value for the variable.
    gulp.src('src/app.js')
        .pipe(replace({
            patterns: [
                {
                    match: 'myFirstApi',
                    replacement: settings. myFirstApi
                },
                {
                    match: 'mySecondApi',
                    replacement: settings. mySecondApi
                },
            ]
        }))
        .pipe(gulp.dest('dist/./'));
});